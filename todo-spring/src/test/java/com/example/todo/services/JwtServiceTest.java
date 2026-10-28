package com.example.todo.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.example.todo.configurations.TodoConfigurationProperties;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
  private final JwtService jwtService = new JwtService(configuration());

  @Test
  void encodesAndDecodesTheUsername() {
    String token = jwtService.generateJwt("alice");

    assertThat(jwtService.decodeJwt(token)).isEqualTo("alice");
  }

  @Test
  void rejectsTokensSignedWithAnotherSecret() {
    TodoConfigurationProperties other = configuration();
    other.getJwt().setSecret("another-secret");
    String token = new JwtService(other).generateJwt("alice");

    assertThatThrownBy(() -> jwtService.decodeJwt(token))
        .isInstanceOf(JWTVerificationException.class);
  }

  @Test
  void rejectsMalformedTokensAndNullInputs() {
    assertThatThrownBy(() -> jwtService.decodeJwt("not-a-token"))
        .isInstanceOf(JWTVerificationException.class);
    assertThatThrownBy(() -> jwtService.generateJwt(null)).isInstanceOf(NullPointerException.class);
    assertThatThrownBy(() -> jwtService.decodeJwt(null)).isInstanceOf(NullPointerException.class);
  }

  private static TodoConfigurationProperties configuration() {
    TodoConfigurationProperties properties = new TodoConfigurationProperties();
    properties.getJwt().setSecret("test-secret");
    properties.getJwt().setExpiry(120);
    return properties;
  }
}
