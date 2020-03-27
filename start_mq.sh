#
# Start brokers
#
docker rm some-rabbit &>/dev/null
docker run -d --hostname my-rabbit --name some-rabbit -p 5672:5672 -p 8080:15672 rabbitmq:3-management
rabbit_ret=$?

docker rm emq30 &>/dev/null
docker run -tid --name emq30 -p 1883:1883 -p 8083:8083 -p 8883:8883 -p 8084:8084 -p 18083:18083 emqx/emqx:v4.0.5-alpine3.10-amd64

exit $? || $rabbit_ret

