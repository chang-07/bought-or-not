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

    pitch1 = Pitch.objects.create(
        author=p1,
        ticker='ATZ',
        target_price=55.00,
        content_body='Aritzia demonstrates strong brand momentum and successful geographic expansion into the US market. Superior unit economics compared to traditional apparel retail.',
        is_verified=True,
        entry_price=40.00,
        current_alpha=8.4,
        spy_entry_price=450.00
    )

    pitch2 = Pitch.objects.create(
        author=p2,
        ticker='CSU',
        target_price=3500.00,
        content_body='Constellation Software maintains an unparalleled track record of disciplined capital allocation and compounding through programmatic VMS acquisitions.',
        is_verified=True,
        entry_price=2800.00,
        current_alpha=15.2,
        spy_entry_price=450.00
    )

    pitch3 = Pitch.objects.create(
        author=p1,
        ticker='EHC',
        target_price=110.00,
        content_body='Encompass Health is positioned to benefit from aging demographics and continuous shift toward inpatient rehabilitation facilities.',
        is_verified=True,
        entry_price=85.00,
        current_alpha=5.1,
        spy_entry_price=450.00
    )

    pitch4 = Pitch.objects.create(
        author=p2,
        ticker='INVH',
        target_price=45.00,
        content_body='Invitation Homes commands significant pricing power in the single-family rental market amidst structural national housing shortages.',
        is_verified=True,
        entry_price=34.00,
        current_alpha=3.8,
        spy_entry_price=450.00
    )

    pitch5 = Pitch.objects.create(
        author=p1,
        ticker='OWL',
        target_price=25.00,
        content_body='Blue Owl Capital offers high structural growth in private credit. Alternative asset managers are capturing massive market share from traditional banking.',
        is_verified=True,
        entry_price=18.00,
        current_alpha=11.5,
        spy_entry_price=450.00
    )

    pitch6 = Pitch.objects.create(
        author=p2,
        ticker='SENEA',
        target_price=75.00,
        content_body='Seneca Foods is a deeply undervalued, asset-rich agricultural player. Counter-cyclical properties provide a robust margin of safety.',
        is_verified=True,
        entry_price=50.00,
        current_alpha=9.2,
        spy_entry_price=450.00
    )

    from core.models import PitchAttachment
    from django.core.files import File

    def attach_pdf(pitch, filename):
        # Resolve the root repo directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        pdf_path = os.path.join(base_dir, filename)
        
        if os.path.exists(pdf_path):
            try:
                # Need to keep file open until the field saves it
                with open(pdf_path, 'rb') as f:
                    django_file = File(f)
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

    print(f"Successfully seeded 6 authentic pitches with AWS S3 deck attachments for authors WarrenBuffett and CathieWood.")

if __name__ == '__main__':
    seed_db()
