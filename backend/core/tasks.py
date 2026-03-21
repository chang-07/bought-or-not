from celery import shared_task
from .models import Pitch, UserProfile
try:
    from snaptrade_client import SnapTrade # type: ignore
except ImportError:
    SnapTrade = type('SnapTrade', (object,), {'__new__': lambda cls, **k: None})
import os
import finnhub # type: ignore

snaptrade = SnapTrade(
    client_id=os.getenv('SNAPTRADE_CLIENT_ID', 'placeholder_client_id'),
    consumer_key=os.getenv('SNAPTRADE_CONSUMER_KEY', 'placeholder_consumer_key')
)

finnhub_client = finnhub.Client(api_key=os.getenv('FINNHUB_API_KEY', 'placeholder_api_key'))

@shared_task
def verify_pitch_holdings(pitch_id: int):
    try:
        pitch = Pitch.objects.get(id=pitch_id)
        profile = pitch.author

        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
            # Keep pitch visible while verification cannot run yet.
            # Author can connect brokerage later and resubmit/reverify.
            pitch.is_verified = False
            if pitch.status != 'TARGET_HIT':
                pitch.status = 'ACTIVE'
            pitch.save()
            return

        try:
            # Get all accounts for the user
            # SDK v11: response.body is always present
            accounts_res = snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret
            )
            accounts = accounts_res.body

            is_verified = False
            cost_basis = None

            for account in accounts:
                if is_verified:
                    break

                # SDK v11: Account objects support dict-style access
                account_id = account['id']

                holdings_res = snaptrade.account_information.get_user_holdings(
                    account_id=account_id,
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret
                )

                # SDK v11: response.body is an AccountHoldingsAccount object
                # with a 'positions' key containing a list of Position objects.
                holdings_data = holdings_res.body
                positions = holdings_data.get('positions') or []

                for pos in positions:
                    # SDK v11 Position structure:
                    #   pos['symbol']            -> PositionSymbol
                    #   pos['symbol']['symbol']  -> UniversalSymbol
                    #   pos['symbol']['symbol']['symbol'] -> ticker string (e.g. "AAPL")
                    position_symbol = pos.get('symbol') or {}
                    universal_symbol = position_symbol.get('symbol') or {}
                    ticker = universal_symbol.get('symbol', '')

                    if ticker.upper() == pitch.ticker.upper():
                        is_verified = True
                        cost_basis = pos.get('average_purchase_price')
                        break

            if is_verified:
                pitch.is_verified = True

                # Set entry price from cost basis or fall back to Finnhub current price
                if cost_basis is not None:
                    pitch.entry_price = cost_basis
                else:
                    quote = finnhub_client.quote(pitch.ticker)
                    pitch.entry_price = quote.get('c', 0)

                # Get SPY baseline for alpha calculation
                spy_quote = finnhub_client.quote('SPY')
                pitch.spy_entry_price = spy_quote.get('c', 0)

                pitch.save()
            else:
                # Keep unverified pitches visible in the feed.
                pitch.is_verified = False
                if pitch.status != 'TARGET_HIT':
                    pitch.status = 'ACTIVE'
                pitch.save()

        except Exception as e:
            print(f"Error calling SnapTrade: {e}")

    except Pitch.DoesNotExist:
        pass


@shared_task
def update_alpha_scores():
    """
    Periodic task to update the 'current_alpha' for all active pitches
    """
    active_pitches = Pitch.objects.filter(status='ACTIVE', is_verified=True)
    if not active_pitches.exists():
        return

    # Cache prices to avoid spamming Finnhub for duplicate tickers
    price_cache = {}

    def get_price(ticker):
        if ticker not in price_cache:
            try:
                quote = finnhub_client.quote(ticker)
                price_cache[ticker] = quote.get('c', 0)
            except Exception:
                price_cache[ticker] = 0
        return price_cache[ticker]

    spy_current_price = get_price('SPY')
    if spy_current_price <= 0:
        return  # Cannot calculate alpha without SPY benchmark

    for pitch in active_pitches:
        if not pitch.entry_price or pitch.entry_price <= 0 or not pitch.spy_entry_price or pitch.spy_entry_price <= 0:
            continue

        current_price = get_price(pitch.ticker)
        if current_price <= 0:
            continue

        # Calculate return vs SPY benchmark (alpha)
        pitch_return = (float(current_price) - float(pitch.entry_price)) / float(pitch.entry_price)
        spy_return = (float(spy_current_price) - float(pitch.spy_entry_price)) / float(pitch.spy_entry_price)

        # Assuming all pitches are Long for MVP
        alpha = pitch_return - spy_return
        pitch.current_alpha = alpha

        # Check if target price has been hit
        if current_price >= float(pitch.target_price):
            pitch.status = 'TARGET_HIT'

        pitch.save()

    # Update UserProfile aggregate stats
    profiles = UserProfile.objects.all()
    for profile in profiles:
        user_pitches = profile.pitches.filter(is_verified=True)
        if user_pitches.exists():
            avg_alpha = sum(float(p.current_alpha) for p in user_pitches) / user_pitches.count()
            target_hit = user_pitches.filter(status='TARGET_HIT').count()
            win_rate = (target_hit / user_pitches.count()) * 100

            profile.total_alpha = avg_alpha
            profile.win_rate = win_rate
            profile.save()

@shared_task
def snapshot_all_portfolios():
    """
    Run daily to snapshot the total portfolio value for all users with linked accounts.
    """
    profiles = UserProfile.objects.filter(snaptrade_secret__isnull=False)
    for profile in profiles:
        try:
            accounts_res = snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret
            )
            # Support both SDK models
            if hasattr(accounts_res, 'body'):
                accounts = getattr(accounts_res, 'body', [])
            else:
                accounts = accounts_res
            
            total_value = 0.0
            
            for account in accounts:
                acc_id = account.get('id') if isinstance(account, dict) else getattr(account, 'id', None)
                if not acc_id: continue

                holdings_res = snaptrade.account_information.get_user_holdings(
                    account_id=str(acc_id),
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret
                )
                
                holdings_body = getattr(holdings_res, 'body', type('obj', (object,), {'balances': [], 'positions': []})())
                # If it's a raw dict vs object
                if isinstance(holdings_body, dict):
                    balances = holdings_body.get('balances', [])
                    raw_positions = (
                        holdings_body.get('positions') or 
                        holdings_body.get('account', {}).get('positions') or 
                        holdings_body.get('holdings', {}).get('positions') or []
                    )
                else:
                    balances = getattr(holdings_body, 'balances', [])
                    raw_positions = getattr(holdings_body, 'positions', [])

                for b in balances:
                    cash_val = b.get('cash') if isinstance(b, dict) else getattr(b, 'cash', 0)
                    total_value += float(cash_val or 0)
                
                for pos in raw_positions:
                    p = float(pos.get('price') or 0) if isinstance(pos, dict) else float(getattr(pos, 'price', 0) or 0)
                    u = float(pos.get('units') or getattr(pos, 'quantity', 0) or 0) if isinstance(pos, dict) else float(getattr(pos, 'units', 0) or 0)
                    total_value += p * u

            from .models import PortfolioSnapshot
            import datetime
            today = datetime.date.today()
            PortfolioSnapshot.objects.update_or_create(
                user=profile,
                date=today,
                defaults={'total_value': total_value}
            )
            
        except Exception as e:
            print(f"Error snapshotting portfolio for {profile.user.username}: {e}")

