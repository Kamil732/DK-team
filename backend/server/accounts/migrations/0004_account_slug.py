# Generated by Django 3.1.7 on 2021-04-08 15:53

import autoslug.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_customerimage'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='slug',
            field=autoslug.fields.AutoSlugField(default='kamil', editable=False, populate_from='first_name'),
            preserve_default=False,
        ),
    ]
