# symfony-docker
Docker image tailed to run symfony application. Check https://hub.docker.com/r/recognizebv/symfony-docker

## What's here?

This repository is a source code for following docker images that allow relatively easily work with symfony php framework. Included images:

- [`php7.2-sf4` (*php7.2-sf4/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7.2-sf4/Dockerfile)
- [`php7.2-sf4-dev` (*php7.2-sf4-dev/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7.2-sf4-dev/Dockerfile)
- [`php7` (*php7/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7/Dockerfile)
- [`php7-dev` (*php7-dev/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7-dev/Dockerfile)
- [`php7.1` (*php7.1/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7.1/Dockerfile)
- [`php7.1-dev` (*php7.1-dev/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7.1-dev/Dockerfile)
- [`php7.0` (*php7.0/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7.0/Dockerfile)
- [`php7.0-dev` (*php7.0-dev/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php7.0-dev/Dockerfile)
- [`php5.6` (*php5.6/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php5.6/Dockerfile)
- [`php5.6-dev` (*php5.6-dev/Dockerfile*)](https://github.com/RecognizeBV/symfony-docker/blob/master/php5.6-dev/Dockerfile)

## What is the concept here?

You use php-dev images to develop by mounting your local directory into machine.
You use non-dev images to copy app code into image and then deploy your application to stage/live environments.

## What is the difference between php* and php*-dev?

Non *dev* images are intended to be used in production. *Dev* images have xdebug installed additionally, so you can use it for debugging.

# Usage

### Development env with docker-compose.yml

You can you this docker-compose.yml file to develop:

```
www:
  image: recognizebv/symfony-docker:php7.1-dev
  volumes:
    - ".:/var/www/html"
  ports:
    - "80:80"
```
Of course you are free to add linked containers like database, caching etc.

### Adjust your symfony app kernel to write cache and logs to /tmp dir
```
    public function getCacheDir()
    {
        return sys_get_temp_dir().'/cache/'.$this->getEnvironment();
    }

    public function getLogDir()
    {
        return sys_get_temp_dir().'/logs/'.$this->getEnvironment();
    }
```

Use ```docker-compose up``` command to start your development environment.

### Output logs to stderr (optional)

You may want to adjust config_dev and config_prod to output logs to stderr (so they will be handled correctly by docker)
``
path:  "php://stderr"
``

# Build production image

You can build production ready image with dockerfile like this:

```
FROM recognizebv/symfony-docker:php7.1
ADD . /var/www/html
# Add your application build steps here, for example:
# RUN ./var/www/html/web/bin/...
RUN rm -rf /var/www/html/web/app_dev.php
RUN rm -rf /var/www/html/web/config.php
```

# FAQ

## What are extensions enabled by default?
* apache mod_rewrite
* intl
* opcache
* pdo
* pdo_mysql
* zip
* gd
* xdebug (only in dev images)

## How do i install additional php extensions?
This work is based on official dockerhub php images. You can use docker-php-ext-install to add new extensions. More informations can be found https://hub.docker.com/_/php/

## Why can't i access app_dev.php?
By default symfony block requests to app_dev.php that come from non localhost sources. You can change that editing app_dev.php file.
