from celery import shared_task
from .models import Pitch, UserProfile
from snaptrade_client import SnapTrade # type: ignore
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
            pitch.status = 'CLOSED'
            pitch.save()
            return
            
        # Call SnapTrade /holdings API
        try:
            # First need to get accounts
            accounts_res = snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret
            )
            
            # Extract accounts. Depending on SDK version, might be a list or object.
            accounts = accounts_res.body if hasattr(accounts_res, 'body') else accounts_res
            
            is_verified = False
            cost_basis = None
            
            for account in accounts:
                if is_verified:
                    break
                account_id = account.get('id') if isinstance(account, dict) else account.id
                
                holdings_res = snaptrade.account_information.get_user_holdings(
                    account_id=account_id,
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret
                )
                
                holdings_data = holdings_res.body if hasattr(holdings_res, 'body') else holdings_res
                positions = holdings_data.get('positions', []) if isinstance(holdings_data, dict) else getattr(holdings_data, 'positions', [])
                
                for pos in positions:
                    pos_dict = pos if isinstance(pos, dict) else pos.__dict__
                    symbol = pos_dict.get('symbol', {})
                    ticker = symbol.get('symbol', '') if isinstance(symbol, dict) else getattr(symbol, 'symbol', '')
                    
                    if ticker.upper() == pitch.ticker.upper():
                        is_verified = True
                        cost_basis = pos_dict.get('average_purchase_price')
                        break
            
            if is_verified:
                pitch.is_verified = True
                
                # Baseline Pricing
                if cost_basis is not None:
                    pitch.entry_price = cost_basis
                else: 
                     # Fallback to Finnhub current price
                     quote = finnhub_client.quote(pitch.ticker)
                     pitch.entry_price = quote.get('c', 0)

                # Get SPY Baseline
                spy_quote = finnhub_client.quote('SPY')
                pitch.spy_entry_price = spy_quote.get('c', 0)

                pitch.save()
            else:
                pitch.status = 'CLOSED' # Reject unverified pitches
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
        return # Cannot calculate alpha without SPY benchmark
        
    for pitch in active_pitches:
         if not pitch.entry_price or pitch.entry_price <= 0 or not pitch.spy_entry_price or pitch.spy_entry_price <= 0:
             continue
             
         current_price = get_price(pitch.ticker)
         if current_price <= 0:
             continue
             
         # Calculate return
         pitch_return = (float(current_price) - float(pitch.entry_price)) / float(pitch.entry_price)
         spy_return = (float(spy_current_price) - float(pitch.spy_entry_price)) / float(pitch.spy_entry_price)
         
         # Assuming all pitches are Long for MVP
         alpha = pitch_return - spy_return
         pitch.current_alpha = alpha
         
         # Check if Target Hit
         if current_price >= float(pitch.target_price):
             pitch.status = 'TARGET_HIT'
             
         pitch.save()
         
    # Update User Profiles
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
