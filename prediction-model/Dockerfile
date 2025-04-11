# syntax=docker/dockerfile:1.4
FROM python:3.13-alpine

WORKDIR /app

RUN apk add --no-cache build-base gfortran libffi-dev openssl-dev

COPY requirements.txt /app
RUN pip3 install -r requirements.txt

COPY . /app

CMD [ "python3", "service.py"]
