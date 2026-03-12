FROM php:8.2-fpm
WORKDIR /app
COPY . .
EXPOSE 9000
CMD ["php-fpm"]
