# Fail / File: Dockerfile
# Pembangun / Developer: Zrain
# Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
# Dikemas kini / Last updated: 2026-11-04
# BM: Resipi imej untuk prototaip backend Java.
# EN: Image recipe for the legacy Java backend.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
COPY src src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd -r -u 10001 appuser
COPY --from=build /workspace/target/zrain-links-1.0.0-SNAPSHOT.jar app.jar
USER appuser
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 10000
ENTRYPOINT ["java","-jar","app.jar"]
