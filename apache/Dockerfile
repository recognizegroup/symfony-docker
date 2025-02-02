ARG BASE_IMAGE
FROM $BASE_IMAGE

ADD apache/docker/apache2.conf /etc/apache2/apache2.conf
ADD apache/docker/000-default.conf /etc/apache2/sites-available/000-default.conf
ADD symfony.ini /usr/local/etc/php/conf.d/symfony.ini
ADD apache/docker/mpm_prefork.conf /etc/apache2/mods-available/mpm_prefork.conf
RUN rm /etc/apache2/conf-available/security.conf && rm /etc/apache2/conf-enabled/security.conf

RUN apt-get update \
    && apt-get install -y libicu-dev git wget unzip libpng-dev libjpeg62-turbo-dev libzip-dev libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN ( \
       docker-php-ext-configure gd --with-jpeg-dir=/usr/include/ \
       || docker-php-ext-configure gd --with-jpeg \
    ) \
    && docker-php-ext-install -j$(nproc) pdo_mysql pdo_pgsql pgsql opcache intl zip gd \
    && a2enmod rewrite headers

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

ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

ARG ENABLE_IMAGE_SUPPORT=false
# We use a specific commit for imagick because php8.3 is not supported by the latest released version (3.7.0)
RUN if [ "$ENABLE_IMAGE_SUPPORT" = true ]; then install-php-extensions vips \
 && install-php-extensions Imagick/imagick@7088edc353f53c4bc644573a79cdcd67a726ae16 \
 && docker-php-ext-enable vips imagick; \
else echo "Image support is disabled"; fi

ARG ENABLE_DEBUG=false
RUN if [ "$ENABLE_DEBUG" = true ]; then pecl install -f xdebug \
 && pecl clear-cache && rm -rf /tmp/pear \
 && echo "zend_extension=$(ls /usr/local/lib/php/*/*/xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \
 && echo "xdebug.mode = develop,debug" >> /usr/local/etc/php/conf.d/xdebug.ini \
 && echo "xdebug.discover_client_host = true" >> /usr/local/etc/php/conf.d/xdebug.ini \
 && echo "xdebug.start_with_request = yes" >> /usr/local/etc/php/conf.d/xdebug.ini \
 && sed -i.bak "s/opcache.validate_timestamps=0/opcache.validate_timestamps=1/g" /usr/local/etc/php/conf.d/symfony.ini \
 && sed -i.bak "s/display_errors = 0/display_errors = 1/g" /usr/local/etc/php/conf.d/general.ini \
 && sed -i.bak "s/display_startup_errors = 0/display_startup_errors = 1/g" /usr/local/etc/php/conf.d/general.ini; \
else echo "Debug is disabled"; fi
ARG NODE_VERSION
ARG TARGETARCH
RUN (curl -SL --fail -o node.tar.xz "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-$TARGETARCH.tar.xz" || curl -SL --fail -o node.tar.xz "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.xz") \
    && tar -xJf "node.tar.xz" -C /usr/local --strip-components=1 \
    && rm "node.tar.xz" \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && npm install --global yarn
