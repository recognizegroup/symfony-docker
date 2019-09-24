FROM recognizebv/symfony-docker:php7.3-node10-dev

ENV LIBVIPS_VERSION 8.7.0
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential pkg-config libglib2.0-dev libexpat1-dev \
 # Image format packages JPEG, EXIF, GIF, Quantized PNG, Text rendering, WebP
 libjpeg62-turbo-dev libexif-dev libgif-dev libimagequant-dev libpango1.0-dev libwebp-dev libmagickwand-dev \
 && cd /tmp \
 && curl -L -O https://github.com/libvips/libvips/releases/download/v$LIBVIPS_VERSION/vips-$LIBVIPS_VERSION.tar.gz \
 && tar zxvf vips-$LIBVIPS_VERSION.tar.gz \
 && cd /tmp/vips-$LIBVIPS_VERSION \
 && ./configure \
 && make \
 && make install \
 && ldconfig \
 && apt-get remove -y build-essential \
 && apt-get autoremove -y \
 && apt-get autoclean \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
 && pecl install vips imagick \
 && docker-php-ext-enable vips imagick
