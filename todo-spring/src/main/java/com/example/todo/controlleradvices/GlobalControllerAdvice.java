package com.example.todo.controlleradvices;

import com.auth0.jwt.exceptions.AlgorithmMismatchException;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalControllerAdvice {
  @ExceptionHandler(Exception.class)
  public ResponseEntity<String> handleException(Exception e) {
    return ResponseEntity.badRequest().body("Error handling request");
  }

  @ExceptionHandler({AuthenticationException.class, SessionAuthenticationException.class})
  public ResponseEntity<String> handleAuthenticationException(Exception e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
  }

  @ExceptionHandler(AuthorizationDeniedException.class)
  public ResponseEntity<String> handleAuthorizationException(AuthorizationDeniedException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(e.getMessage());
  }

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<String> handleNoSuchElementException(NoSuchElementException e) {
    return ResponseEntity.badRequest().body("Element not found");
  }

  @ExceptionHandler({
    AlgorithmMismatchException.class,
    TokenExpiredException.class,
    JWTVerificationException.class,
    JWTCreationException.class
  })
  public ResponseEntity<String> handleJwtException(Exception e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
    return ResponseEntity.internalServerError().body("Runtime error handling request");
  }
}
