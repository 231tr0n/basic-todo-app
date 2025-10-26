package com.example.todo.services;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.AlgorithmMismatchException;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import com.example.todo.entities.UserEntity;
import java.time.Instant;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final long expiration;

  @NonNull private final Algorithm algorithm;

  public JwtService(
      @NonNull @Value("${jwt.secret}") String secret, @Value("${jwt.expiration}") long expiration) {
    this.expiration = expiration;
    this.algorithm = Algorithm.HMAC256(secret);
  }

  public String generateJwt(@NonNull UserEntity user)
      throws IllegalArgumentException, JWTCreationException {
    Instant now = Instant.now();
    return JWT.create()
        .withSubject(user.getUsername())
        .withIssuedAt(now)
        .withExpiresAt(now.plusSeconds(expiration))
        .sign(algorithm);
  }

  public String decodeJwt(@NonNull String token)
      throws AlgorithmMismatchException, TokenExpiredException, JWTVerificationException {
    return JWT.require(algorithm).build().verify(token).getSubject();
  }
}
