package com.example.todo.services;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.example.todo.configurations.TodoConfigurationProperties;
import java.time.Instant;
import lombok.NonNull;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final TodoConfigurationProperties.Jwt jwtConfiguration;

  public JwtService(TodoConfigurationProperties configurationProperties) {
    this.jwtConfiguration = configurationProperties.getJwt();
  }

  public String generateJwt(@NonNull String username) {
    Instant now = Instant.now();
    return JWT.create()
        .withSubject(username)
        .withIssuedAt(now)
        .withExpiresAt(now.plusSeconds(jwtConfiguration.getExpiry()))
        .sign(Algorithm.HMAC512(jwtConfiguration.getSecret()));
  }

  public String decodeJwt(@NonNull String token) {
    return JWT.require(Algorithm.HMAC512(jwtConfiguration.getSecret()))
        .build()
        .verify(token)
        .getSubject();
  }
}
