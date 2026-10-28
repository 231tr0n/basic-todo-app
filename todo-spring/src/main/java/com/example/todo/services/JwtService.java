package com.example.todo.services;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.example.todo.configurations.TodoConfigurationProperties;
import java.time.Instant;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class JwtService {
  private final TodoConfigurationProperties configurationProperties;

  public String generateJwt(@NonNull String username) {
    Instant now = Instant.now();
    return JWT.create()
        .withSubject(username)
        .withIssuedAt(now)
        .withExpiresAt(now.plusSeconds(configurationProperties.getJwt().getExpiry()))
        .sign(Algorithm.HMAC512(configurationProperties.getJwt().getSecret()));
  }

  public String decodeJwt(@NonNull String token) {
    return JWT.require(Algorithm.HMAC512(configurationProperties.getJwt().getSecret()))
        .build()
        .verify(token)
        .getSubject();
  }
}
