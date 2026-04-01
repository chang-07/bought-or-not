"""
URL configuration for vspp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path
from django.conf import settings
from django.views.static import serve
import os
from vspp.api import api

from django.views.decorators.clickjacking import xframe_options_exempt

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
    # Explicitly serve media files natively in production to support local Docker deployments without S3
    re_path(r'^media/(?P<path>.*)$', xframe_options_exempt(serve), {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^pitch_decks/(?P<path>.*)$', xframe_options_exempt(serve), {'document_root': os.path.join(settings.MEDIA_ROOT, 'pitch_decks')}),
]
