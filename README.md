# webhook-request-server

`docker build -t gyvastis/webhook-request-server:latest -f docker/Dockerfile_arm32v7 .`

`docker run -e CLOUDAMQP_URL='your_cloudamqp_url' gyvastis/webhook-request-server:latest`
