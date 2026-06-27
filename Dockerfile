# Self-contained static image for the de-hooked AB China (wx) web build.
FROM nginx:alpine
COPY public /usr/share/nginx/html
COPY deploy/nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
