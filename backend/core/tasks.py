from celery import shared_task
from .models import Pitch, UserProfile
from snaptrade_client import SnapTrade # type: ignore
import os

snaptrade = SnapTrade(
    client_id=os.getenv('SNAPTRADE_CLIENT_ID', 'placeholder_client_id'),
    consumer_key=os.getenv('SNAPTRADE_CONSUMER_KEY', 'placeholder_consumer_key')
)

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
                if cost_basis is not None:
                    pitch.entry_price = cost_basis
                pitch.save()
            else:
                pitch.status = 'CLOSED' # Reject unverified pitches
                pitch.save()
                
        except Exception as e:
            print(f"Error calling SnapTrade: {e}")
            
    except Pitch.DoesNotExist:
        pass
