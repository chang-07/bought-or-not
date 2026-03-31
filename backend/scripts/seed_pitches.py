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
        ticker='AAPL',
        target_price=250.00,
        content_body='The transition to services revenue provides durable moat. AI supercycle on the newest iPhones will drive unexpected hardware upgrades across the stagnant user base. Sitting on an insurmountable pile of cash flow.',
        is_verified=True,
        entry_price=175.50,
        current_alpha=12.4, # 12.4% outperformance against SPY
        spy_entry_price=450.00
    )

    pitch2 = Pitch.objects.create(
        author=p2,
        ticker='TSLA',
        target_price=350.00,
        content_body='The Robotaxi network and FSD V12 unlock a multi-trillion dollar TAM previously unpriced by legacy automotive analysts. Battery storage deployments growing exponentially year over year.',
        is_verified=True,
        entry_price=210.00,
        current_alpha=-3.2, # Underperforming SPY temporarily
        spy_entry_price=470.00
    )

    pitch3 = Pitch.objects.create(
        author=p1,
        ticker='KO',
        target_price=80.00,
        content_body='Classic defensive stock with unparalleled pricing power and global distribution. Consistent dividend aristocrat operating in an inflation-resilient bracket.',
        is_verified=True,
        entry_price=60.00,
        current_alpha=4.1,
        spy_entry_price=480.00
    )

    print(f"Successfully seeded 3 verified pitches for authors WarrenBuffett and CathieWood.")

if __name__ == '__main__':
    seed_db()
