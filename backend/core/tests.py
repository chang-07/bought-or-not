from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from .models import UserProfile, Pitch, HiddenPitch


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class AuthTests(TestCase):
    """Test authentication endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_login_success(self):
        resp = self.client.post(
            "/api/login",
            data='{"username": "testuser", "password": "testpass123"}',
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["username"], "testuser")
        self.assertIsNotNone(data["token"])

    def test_login_failure(self):
        resp = self.client.post(
            "/api/login",
            data='{"username": "testuser", "password": "wrong"}',
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertIn("error", data)

    def test_signup_success(self):
        resp = self.client.post(
            "/api/signup",
            data='{"username": "newuser", "password": "newpass123", "email": "new@example.com"}',
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["username"], "newuser")
        self.assertIsNotNone(data["token"])

    def test_signup_duplicate_username(self):
        resp = self.client.post(
            "/api/signup",
            data='{"username": "testuser", "password": "any", "email": "dup@example.com"}',
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertIn("error", data)

    def test_logout(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        token = profile.rotate_token()
        resp = self.client.post(
            "/api/logout",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        profile.refresh_from_db()
        self.assertIsNone(profile.auth_token)


class PitchTests(TestCase):
    """Test pitch CRUD endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="pitcher",
            email="pitcher@example.com",
            password="pitchpass123",
        )
        self.profile = UserProfile.objects.create(user=self.user)
        self.token = self.profile.rotate_token()

    def test_create_pitch(self):
        resp = self.client.post(
            "/api/pitches",
            data={
                "ticker": "AAPL",
                "target_price": "200.0",
                "content_body": "Bullish on AI",
            },
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        if resp.status_code != 200:
            print(f"Response: {resp.content.decode()}")
            print(f"Content-Type: {resp.get('Content-Type', 'N/A')}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIsNotNone(data["pitch_id"])

    def test_list_pitches(self):
        Pitch.objects.create(
            author=self.profile,
            ticker="GOOGL",
            target_price=150.0,
            content_body="Search moat",
            status="ACTIVE",
        )
        resp = self.client.get("/api/pitches")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["ticker"], "GOOGL")

    def test_hide_pitch(self):
        # Create a pitch from another user
        other_user = User.objects.create_user(
            username="other_pitcher", password="otherpass123"
        )
        other_profile = UserProfile.objects.create(user=other_user)
        pitch = Pitch.objects.create(
            author=other_profile,
            ticker="MSFT",
            target_price=400.0,
            content_body="Cloud growth",
            status="ACTIVE",
        )

        resp = self.client.post(
            f"/api/pitches/{pitch.id}/hide",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])

        # Verify HiddenPitch was created
        self.assertEqual(
            HiddenPitch.objects.filter(user=self.profile, pitch=pitch).count(), 1
        )

        # Verify the pitch is excluded from the feed for this user
        pitches = Pitch.objects.filter(status="ACTIVE").exclude(
            hidden_by__user=self.profile
        )
        self.assertEqual(pitches.count(), 0)

    def test_restore_all_pitches(self):
        other_user = User.objects.create_user(username="other", password="otherpass123")
        other_profile = UserProfile.objects.create(user=other_user)
        pitch = Pitch.objects.create(
            author=other_profile,
            ticker="TSLA",
            target_price=300.0,
            content_body="EV leader",
            status="ACTIVE",
        )
        HiddenPitch.objects.create(user=self.profile, pitch=pitch)

        resp = self.client.post(
            "/api/pitches/restore_all",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        self.assertEqual(HiddenPitch.objects.filter(user=self.profile).count(), 0)

    def test_pitch_search(self):
        Pitch.objects.create(
            author=self.profile,
            ticker="NVDA",
            target_price=500.0,
            content_body="GPU dominance",
            status="ACTIVE",
        )
        resp = self.client.get("/api/pitches?search=NVDA")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["ticker"], "NVDA")


class AuthorTests(TestCase):
    """Test author profile endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="author1",
            email="author@example.com",
            password="authorpass123",
        )
        self.profile = UserProfile.objects.create(user=self.user)
        Pitch.objects.create(
            author=self.profile,
            ticker="AMZN",
            target_price=180.0,
            content_body="AWS growth",
            status="ACTIVE",
        )

    def test_get_author_profile(self):
        resp = self.client.get("/api/author/author1")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["author"]["username"], "author1")
        self.assertEqual(data["author"]["total_pitches"], 1)

    def test_author_not_found(self):
        resp = self.client.get("/api/author/nonexistent")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("error", data)


class MyPitchesTests(TestCase):
    """Test my pitches analytics endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="analytics_user",
            email="analytics@example.com",
            password="analyticspass123",
        )
        self.profile = UserProfile.objects.create(user=self.user)
        self.token = self.profile.rotate_token()
        Pitch.objects.create(
            author=self.profile,
            ticker="META",
            target_price=500.0,
            content_body="Social + VR",
            status="ACTIVE",
            is_verified=True,
        )
        Pitch.objects.create(
            author=self.profile,
            ticker="NFLX",
            target_price=600.0,
            content_body="Streaming wars",
            status="CLOSED",
        )

    def test_my_pitches_analytics(self):
        resp = self.client.get(
            "/api/my/pitches",
            HTTP_AUTHORIZATION=f"Bearer {self.token}",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["author"]["username"], "analytics_user")
        self.assertEqual(data["author"]["total_pitches"], 2)
        self.assertEqual(data["author"]["active_pitches"], 1)
        self.assertEqual(data["author"]["verified_pitches"], 1)
        self.assertEqual(data["author"]["closed_pitches"], 1)
