package com.example.todo.controlleradvices;

import static org.assertj.core.api.Assertions.assertThat;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.example.todo.exceptions.ConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;

class GlobalControllerAdviceTest {
  private final GlobalControllerAdvice advice = new GlobalControllerAdvice();

  @Test
  void mapsExceptionsToHttpStatuses() {
    assertStatus(advice.handleNoResourceFoundException(null), HttpStatus.NOT_FOUND);
    assertStatus(advice.handleAuthenticationException(null), HttpStatus.UNAUTHORIZED);
    assertStatus(advice.handleAuthorizationDeniedException(null), HttpStatus.FORBIDDEN);
    assertStatus(advice.handleNoSuchElementException(null), HttpStatus.NOT_FOUND);
    assertStatus(
        advice.handleBadRequestException(new IllegalArgumentException("bad")),
        HttpStatus.BAD_REQUEST);
    assertStatus(
        advice.handleConflictException(new ConflictException("conflict")), HttpStatus.CONFLICT);
    assertStatus(
        advice.handleDataIntegrityViolationException(new DataIntegrityViolationException("dup")),
        HttpStatus.CONFLICT);
    assertStatus(
        advice.handleJwtVerificationException(new JWTVerificationException("invalid")),
        HttpStatus.UNAUTHORIZED);
    assertStatus(
        advice.handleAsyncRequestTimeoutException(new AsyncRequestTimeoutException()),
        HttpStatus.SERVICE_UNAVAILABLE);
    assertStatus(
        advice.handleException(new RuntimeException("boom")), HttpStatus.INTERNAL_SERVER_ERROR);
  }

  @Test
  void exposesTheExceptionDetailsForClientErrors() {
    assertThat(advice.handleBadRequestException(new IllegalArgumentException("bad")).getBody())
        .isEqualTo("bad");
    assertThat(advice.handleConflictException(new ConflictException("conflict")).getBody())
        .isEqualTo("conflict");
    assertThat(
            advice
                .handleDataIntegrityViolationException(new DataIntegrityViolationException("dup"))
                .getBody())
        .isEqualTo("Data conflict");
  }

  private static void assertStatus(ResponseEntity<String> response, HttpStatus status) {
    assertThat(response.getStatusCode()).isEqualTo(status);
  }
}
