from celery import shared_task
from .models import Pitch, UserProfile
from .clients import snaptrade, finnhub_client


@shared_task
def verify_pitch_holdings(pitch_id: int):
    """Verify that the author actually holds the pitched stock."""
    try:
        pitch = Pitch.objects.get(id=pitch_id)
        profile = pitch.author

        if not profile.snaptrade_secret or not profile.snaptrade_user_id:
            pitch.is_verified = False
            if pitch.status != "TARGET_HIT":
                pitch.status = "ACTIVE"
            pitch.save()
            return

        try:
            accounts_res = snaptrade.account_information.list_user_accounts(
                user_id=str(profile.snaptrade_user_id),
                user_secret=profile.snaptrade_secret,
            )
            accounts = accounts_res.body

            is_verified = False
            cost_basis = None

            for account in accounts:
                if is_verified:
                    break

                account_id = account["id"]

                holdings_res = snaptrade.account_information.get_user_holdings(
                    account_id=account_id,
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret,
                )

                holdings_data = holdings_res.body
                positions = holdings_data.get("positions") or []

                for pos in positions:
                    position_symbol = pos.get("symbol") or {}
                    universal_symbol = position_symbol.get("symbol") or {}
                    ticker = universal_symbol.get("symbol", "")

                    if ticker.upper() == pitch.ticker.upper():
                        is_verified = True
                        cost_basis = pos.get("average_purchase_price")
                        break

            if is_verified:
                pitch.is_verified = True

                if cost_basis is not None:
                    pitch.entry_price = cost_basis
                else:
                    quote = finnhub_client.quote(pitch.ticker)
                    pitch.entry_price = quote.get("c", 0)

                pitch.save()
            else:
                pitch.is_verified = False
                if pitch.status != "TARGET_HIT":
                    pitch.status = "ACTIVE"
                pitch.save()

        except Exception as e:
            print(f"Error calling SnapTrade: {e}")

    except Pitch.DoesNotExist:
        pass


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
                user_secret=profile.snaptrade_secret,
            )
            # Support both SDK models
            if hasattr(accounts_res, "body"):
                accounts = getattr(accounts_res, "body", [])
            else:
                accounts = accounts_res

            total_value = 0.0

            for account in accounts:
                acc_id = (
                    account.get("id")
                    if isinstance(account, dict)
                    else getattr(account, "id", None)
                )
                if not acc_id:
                    continue

                holdings_res = snaptrade.account_information.get_user_holdings(
                    account_id=str(acc_id),
                    user_id=str(profile.snaptrade_user_id),
                    user_secret=profile.snaptrade_secret,
                )

                holdings_body = getattr(
                    holdings_res,
                    "body",
                    type("obj", (object,), {"balances": [], "positions": []})(),
                )
                # If it's a raw dict vs object
                if isinstance(holdings_body, dict):
                    balances = holdings_body.get("balances", [])
                    raw_positions = (
                        holdings_body.get("positions")
                        or holdings_body.get("account", {}).get("positions")
                        or holdings_body.get("holdings", {}).get("positions")
                        or []
                    )
                else:
                    balances = getattr(holdings_body, "balances", [])
                    raw_positions = getattr(holdings_body, "positions", [])

                for b in balances:
                    cash_val = (
                        b.get("cash") if isinstance(b, dict) else getattr(b, "cash", 0)
                    )
                    total_value += float(cash_val or 0)

                for pos in raw_positions:
                    p = (
                        float(pos.get("price") or 0)
                        if isinstance(pos, dict)
                        else float(getattr(pos, "price", 0) or 0)
                    )
                    u = (
                        float(pos.get("units") or getattr(pos, "quantity", 0) or 0)
                        if isinstance(pos, dict)
                        else float(getattr(pos, "units", 0) or 0)
                    )
                    total_value += p * u

            from .models import PortfolioSnapshot
            import datetime

            today = datetime.date.today()
            PortfolioSnapshot.objects.update_or_create(
                user=profile, date=today, defaults={"total_value": total_value}
            )

        except Exception as e:
            print(f"Error snapshotting portfolio for {profile.user.username}: {e}")
