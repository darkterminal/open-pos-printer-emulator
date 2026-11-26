FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpq-dev \
    libzip-dev \
    nodejs \
    npm \
    oniguruma-dev \
    postgresql-dev \
    unzip \
    zip \
    $PHPIZE_DEPS \
  && docker-php-ext-install -j$(nproc) bcmath intl mbstring pcntl pdo pdo_pgsql zip \
  && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-progress || true

COPY . .
RUN composer install --no-interaction --prefer-dist --no-scripts --no-progress || true

EXPOSE 8080
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]
