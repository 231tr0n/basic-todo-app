package com.example.todo.services;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.example.todo.entities.UserEntity;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class JwtService {

  @Value("${jwt.expiry}")
  @NonNull
  private final Integer expiry;

  @Value("${jwt.secret}")
  @NonNull
  private final String secret;

  public String generateJwt(@NonNull UserEntity user) {
    Instant now = Instant.now();
    return JWT.create()
        .withSubject(user.getUsername())
        .withIssuedAt(now)
        .withExpiresAt(now.plusSeconds(expiry))
        .sign(Algorithm.HMAC512(secret));
  }

  public String decodeJwt(@NonNull String token) {
    return JWT.require(Algorithm.HMAC512(secret)).build().verify(token).getSubject();
  }
}
