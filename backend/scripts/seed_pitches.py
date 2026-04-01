import os
import sys
import django

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vspp.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import UserProfile, Pitch

def seed_db():
    # 1. Create Mock Authors
    u1, _ = User.objects.get_or_create(username='WarrenBuffett', defaults={'email': 'warren@berkshire.com'})
    u1.set_password('valueinvesting123')
    u1.save()
    p1, _ = UserProfile.objects.get_or_create(user=u1, defaults={'snaptrade_secret': 'fake_secret'})

    u2, _ = User.objects.get_or_create(username='CathieWood', defaults={'email': 'cathie@ark.com'})
    u2.set_password('innovation456')
    u2.save()
    p2, _ = UserProfile.objects.get_or_create(user=u2, defaults={'snaptrade_secret': 'fake_secret'})

    # 2. Create Verified Dummy Pitches
    # Delete existing to prevent duplication on multiple runs
    Pitch.objects.filter(author__in=[p1, p2]).delete()

    import requests
    import os
    from core.tasks import update_alpha_scores

    def get_live_open_price(ticker):
        try:
            url = f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={os.getenv('FINNHUB_API_KEY', '')}"
            res = requests.get(url, timeout=5)
            data = res.json()
            val = float(data.get("o", 0) or 0)
            return val if val > 0 else 100.0 # fallback
        except Exception:
            return 100.0

    print("Fetching live market open prices from Finnhub...")
    spy_open = get_live_open_price("SPY")

    pitch_configs = [
        (p1, 'ATZ', 55.00, 'Aritzia demonstrates strong brand momentum and successful geographic expansion into the US market. Superior unit economics compared to traditional apparel retail.'),
        (p2, 'CSU', 3500.00, 'Constellation Software maintains an unparalleled track record of disciplined capital allocation and compounding through programmatic VMS acquisitions.'),
        (p1, 'EHC', 110.00, 'Encompass Health is positioned to benefit from aging demographics and continuous shift toward inpatient rehabilitation facilities.'),
        (p2, 'INVH', 45.00, 'Invitation Homes commands significant pricing power in the single-family rental market amidst structural national housing shortages.'),
        (p1, 'OWL', 25.00, 'Blue Owl Capital offers high structural growth in private credit. Alternative asset managers are capturing massive market share from traditional banking.'),
        (p2, 'SENEA', 75.00, 'Seneca Foods is a deeply undervalued, asset-rich agricultural player. Counter-cyclical properties provide a robust margin of safety.')
    ]

    pitches = []
    for author, ticker, target, body in pitch_configs:
        entry = get_live_open_price(ticker)
        pitch = Pitch.objects.create(
            author=author,
            ticker=ticker,
            target_price=target,
            content_body=body,
            is_verified=True,
            entry_price=entry,
            current_alpha=0.0, # Will be synchronized below
            spy_entry_price=spy_open
        )
        pitches.append(pitch)

    try:
        pitch1, pitch2, pitch3, pitch4, pitch5, pitch6 = pitches
    except ValueError:
        pass

    from core.models import PitchAttachment
    from django.core.files import File

    def attach_pdf(pitch, filename):
        # Resolve the backend repo directory instead of outer repository
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        pdf_path = os.path.join(base_dir, 'seed-assets', filename)
        
        if os.path.exists(pdf_path):
            try:
                # Need to keep file open until the field saves it
                with open(pdf_path, 'rb') as f:
                    django_file = File(f, name=filename)
                    PitchAttachment.objects.create(
                        pitch=pitch,
                        file=django_file,  # Django-storages handles the S3 upload
                        file_name=filename,
                        file_size_bytes=os.path.getsize(pdf_path),
                        file_type="application/pdf"
                    )
            except Exception as e:
                print(f"Warning: Failed to attach {filename} to {pitch.ticker}: {e}")
        else:
            print(f"Notice: {filename} not found in root directory, skipping attachment.")

    attach_pdf(pitch1, 'CRG_ATZ_vF.pdf')
    attach_pdf(pitch2, 'CSU_TMT_vF.pdf')
    attach_pdf(pitch3, 'EHC+Long+-+Deck.pdf')
    attach_pdf(pitch4, 'INVH-Pitch.pdf')
    attach_pdf(pitch5, 'OWL+Deck.pdf')
    attach_pdf(pitch6, 'SENEA_IND_vFINAL.pdf')

    try:
        print("Synchronizing Alpha metrics with live Finnhub market data...")
        update_alpha_scores()
    except Exception as e:
        print(f"Failed to calculate Alpha scores: {e}")

    print(f"Successfully seeded 6 authentic pitches with AWS S3 deck attachments for authors WarrenBuffett and CathieWood.")

if __name__ == '__main__':
    seed_db()
