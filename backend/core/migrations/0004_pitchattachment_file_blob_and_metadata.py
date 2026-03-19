from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_pitch_current_alpha_pitch_spy_entry_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="pitchattachment",
            name="file_blob",
            field=models.BinaryField(
                blank=True,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="pitchattachment",
            name="file_name",
            field=models.CharField(
                blank=True,
                default="",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="pitchattachment",
            name="file_size_bytes",
            field=models.BigIntegerField(
                blank=True,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="pitchattachment",
            name="file_type",
            field=models.CharField(max_length=100),
        ),
        migrations.RemoveField(
            model_name="pitchattachment",
            name="file_url",
        ),
    ]
