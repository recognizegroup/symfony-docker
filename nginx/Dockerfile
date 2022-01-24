ARG BASE_IMAGE
FROM $BASE_IMAGE

RUN apt-get update \
    && apt-get install -y supervisor nginx libicu-dev git wget unzip libpng-dev libjpeg62-turbo-dev libzip-dev libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


ADD nginx/docker/nginx-default.conf /etc/nginx/sites-available/default
ADD nginx/docker/nginx.conf /etc/nginx/nginx.conf
ADD nginx/docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
ADD nginx/docker/php-fpm-app.conf /usr/local/etc/php-fpm.d/php-fpm-app.conf
ADD symfony.ini /usr/local/etc/php/conf.d/symfony.ini

ENV PHP_FPM_PM="static"
ENV PHP_FPM_MAX_CHILDREN="20"
ENV PHP_FPM_START_SERVERS="2"
ENV PHP_FPM_MIN_SPARE_SERVERS="1"
ENV PHP_FPM_MAX_SPARE_SERVERS="2"
ENV PHP_FPM_MAX_REQUESTS="1000"

ADD nginx/docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/www.conf

RUN ( \
       docker-php-ext-configure gd --with-jpeg-dir=/usr/include/ \
       || docker-php-ext-configure gd --with-jpeg \
    ) \
    && docker-php-ext-install pdo_mysql pdo_pgsql pgsql opcache intl zip gd

RUN pecl install apcu \
    && pecl clear-cache \
    && echo "extension=apcu.so" > /usr/local/etc/php/conf.d/apcu.ini


# Upload settings
RUN echo "file_uploads = On\n" \
         "memory_limit = 256M\n" \
         "upload_max_filesize = 256M\n" \
         "post_max_size = 256M\n" \
         "max_execution_time = 30\n" \
         > /usr/local/etc/php/conf.d/uploads.ini

# General PHP settings
RUN echo "display_errors = 0\n" \
         "display_startup_errors = 0" \
         > /usr/local/etc/php/conf.d/general.ini

# https://getcomposer.org/doc/03-cli.md#composer-allow-superuser
ENV COMPOSER_ALLOW_SUPERUSER 1

# Install composer
RUN curl -sS https://getcomposer.org/installer | php \
    && mv composer.phar /usr/local/bin/composer \
    && mkdir /var/www/html/public

ARG NODE_VERSION
RUN (curl -SL -o node.tar.xz "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-$TARGETARCH.tar.xz" || curl -SL -o node.tar.xz "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.xz") \
    && tar -xJf "node.tar.xz" -C /usr/local --strip-components=1 \
    && rm "node.tar.xz" \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && npm install --global yarn

ARG LIBVIPS_VERSION=8.8.3
ARG ENABLE_IMAGE_SUPPORT=false
RUN $ENABLE_IMAGE_SUPPORT \
 && apt-get update \
 && apt-get install -y --no-install-recommends build-essential pkg-config libglib2.0-dev libexpat1-dev \
 # Image format packages JPEG, EXIF, GIF, Quantized PNG, Text rendering, WebP
 libjpeg62-turbo-dev libexif-dev libgif-dev libpango1.0-dev libwebp-dev libmagickwand-dev \
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
 && docker-php-ext-enable vips imagick \
 || true

ARG ENABLE_DEBUG=false
RUN $ENABLE_DEBUG \
 && pecl install -f xdebug \
 && pecl clear-cache && rm -rf /tmp/pear \
 && echo "zend_extension=$(ls /usr/local/lib/php/*/*/xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \
 && echo "xdebug.mode = develop,debug" >> /usr/local/etc/php/conf.d/xdebug.ini \
 && echo "xdebug.discover_client_host = true" >> /usr/local/etc/php/conf.d/xdebug.ini \
 && echo "xdebug.start_with_request = yes" >> /usr/local/etc/php/conf.d/xdebug.ini \
 && sed -i.bak "s/opcache.validate_timestamps=0/opcache.validate_timestamps=1/g" /usr/local/etc/php/conf.d/symfony.ini \
 && sed -i.bak "s/display_errors = 0/display_errors = 1/g" /usr/local/etc/php/conf.d/general.ini \
 && sed -i.bak "s/display_startup_errors = 0/display_startup_errors = 1/g" /usr/local/etc/php/conf.d/general.ini \
 || true

RUN usermod -aG www-data www-data \
        && usermod -aG tty www-data \
        && mkdir -p /var/cache/nginx \
        # nginx user must own the cache and etc directory to write cache and tweak the nginx config
        && chown -R www-data:www-data /var/cache/nginx \
        && chmod -R g+w /var/cache/nginx \
        && chown -R www-data:www-data /var/log/nginx \
        && chmod -R g+w /var/log/nginx \
        && chown -R www-data:www-data /etc/nginx \
        && chmod -R g+w /etc/nginx \
        && apt-get remove --purge --auto-remove -y gnupg1 && rm -rf /var/lib/apt/lists/*

USER www-data:www-data

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
