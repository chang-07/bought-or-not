import os
import sys
import django
import json

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vspp.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import UserProfile, Pitch, PitchAttachment

def seed_slidedecks():
    # 1. Ensure Mock Authors exist
    authors_data = [
        {'username': 'InstitutionalAnalyst', 'email': 'analyst@bloomberg.com', 'password': 'analyst123', 'secret': 'analyst_secret'},
        {'username': 'QuantFund', 'email': 'quant@alpha.com', 'password': 'quant456', 'secret': 'quant_secret'},
        {'username': 'ValueHunter', 'email': 'value@invest.com', 'password': 'value789', 'secret': 'value_secret'}
    ]
    
    profiles = []
    for data in authors_data:
        u, _ = User.objects.get_or_create(username=data['username'], defaults={'email': data['email']})
        u.set_password(data['password'])
        u.save()
        p, _ = UserProfile.objects.get_or_create(user=u, defaults={'snaptrade_secret': data['secret']})
        profiles.append(p)

    # 2. Define Slidedeck Mapping
    # PDFs are located in /Users/chang/coding/bon/
    base_path = "/Users/chang/coding/bon"
    
    slidedecks = [
        {
            'file': 'CRG_ATZ_vF.pdf',
            'ticker': 'ATZ',
            'author': profiles[0],
            'target': 65.00,
            'alpha': 0.082,  # +8.2% alpha vs SPY
            'body': 'Aritzia (ATZ.TO) is a vertically integrated design house with significant runway in the US market. Their "Everyday Luxury" positioning provides resilience across cycles, with consistent e-commerce growth and high-performing retail footprints driving alpha.'
        },
        {
            'file': 'CSU_TMT_vF.pdf',
            'ticker': 'CSU',
            'author': profiles[1],
            'target': 5000.00,
            'alpha': 0.154,  # +15.4% alpha vs SPY
            'body': 'Constellation Software (CSU.TO) is a premier vertical market software (VMS) acquirer. Their decentralized operational model and disciplined capital allocation for M&A generate consistent free cash flow growth and ROIC well above their cost of capital.'
        },
        {
            'file': 'EHC+Long+-+Deck.pdf',
            'ticker': 'EHC',
            'author': profiles[2],
            'target': 120.00,
            'alpha': -0.021,  # -2.1% alpha vs SPY
            'body': 'Encompass Health (EHC) is the leader in inpatient rehabilitation. With aging demographics and a shift towards Value-Based Care, EHC is poised to capture market share through both facility expansion and organic volume growth in post-acute care.'
        },
        {
            'file': 'INVH-Pitch.pdf',
            'ticker': 'INVH',
            'author': profiles[0],
            'target': 45.00,
            'alpha': 0.047,  # +4.7% alpha vs SPY
            'body': 'Invitation Homes (INVH) dominates the Single-Family Rental (SFR) market. Operational efficiencies and a high-barrier-to-entry portfolio in supply-constrained markets provide a strong yield profile and long-term capital appreciation potential.'
        },
        {
            'file': 'OWL+Deck.pdf',
            'ticker': 'OWL',
            'author': profiles[1],
            'target': 25.00,
            'alpha': 0.112,  # +11.2% alpha vs SPY
            'body': 'Blue Owl Capital (OWL) is a fast-growing alternative asset manager focused on direct lending and GP stakes. Their permanent capital base and high-margin management fees offer a defensive yet growth-oriented "toll-bridge" business model in private credit.'
        },
        {
            'file': 'SENEA_IND_vFINAL.pdf',
            'ticker': 'SENEA',
            'author': profiles[2],
            'target': 75.00,
            'alpha': -0.038,  # -3.8% alpha vs SPY
            'body': 'Seneca Foods (SENEA) is an undervalued consumer staples play. As the dominant producer of canned vegetables in the US, their fortress-like market share and trading at a significant discount to book value provide a deep-value opportunity with a large margin of safety.'
        }
    ]

    print(f"Starting seed process for {len(slidedecks)} slide decks...")

    for deck in slidedecks:
        file_path = os.path.join(base_path, deck['file'])
        if not os.path.exists(file_path):
            print(f"Warning: File not found at {file_path}. Skipping.")
            continue
        
        entry = deck['target'] * 0.8  # Synthetic entry price for demo

        # Create Pitch with alpha and SPY baseline
        pitch = Pitch.objects.create(
            author=deck['author'],
            ticker=deck['ticker'],
            target_price=deck['target'],
            content_body=deck['body'],
            is_verified=True,
            status='ACTIVE',
            entry_price=entry,
            spy_entry_price=550.00,  # SPY baseline for alpha calc
            current_alpha=deck['alpha'],
        )
        
        # Read file and create attachment
        with open(file_path, 'rb') as f:
            blob = f.read()
            file_size = os.path.getsize(file_path)
            
            PitchAttachment.objects.create(
                pitch=pitch,
                file_blob=blob,
                file_name=deck['file'],
                file_size_bytes=file_size,
                file_type='application/pdf'
            )
        
        print(f"Successfully seeded pitch for {deck['ticker']} with attachment {deck['file']}.")

    print("Seed process complete.")

if __name__ == '__main__':
    seed_slidedecks()
