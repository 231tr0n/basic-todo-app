package com.example.todo.controlleradvices;

import com.auth0.jwt.exceptions.AlgorithmMismatchException;
import com.auth0.jwt.exceptions.JWTCreationException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalControllerAdvice {
  @ExceptionHandler(Exception.class)
  public ResponseEntity<String> handleException(Exception e) {
    return ResponseEntity.badRequest().body("Error handling request");
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<String> handleException(AuthenticationException e) {
    return ResponseEntity.badRequest().body("Not authorized");
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    AlgorithmMismatchException.class,
    TokenExpiredException.class,
    JWTVerificationException.class,
    JWTCreationException.class
  })
  public ResponseEntity<String> handleJwtException(AuthenticationException e) {
    return ResponseEntity.badRequest().body("Forbidden request");
  }

  @ExceptionHandler(RuntimeException.class)
  public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
    return ResponseEntity.internalServerError().body("Runtime error handling request");
  }
}
