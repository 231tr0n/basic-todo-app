package com.example.todo.controlleradvices;

import com.auth0.jwt.exceptions.JWTVerificationException;
import com.example.todo.exceptions.ConflictException;
import jakarta.validation.ConstraintViolationException;
import java.util.NoSuchElementException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalControllerAdvice {
  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<String> handleNoResourceFoundException(NoResourceFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Resource not found");
  }

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<String> handleAuthenticationException(AuthenticationException exception) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
  }

  @ExceptionHandler(AuthorizationDeniedException.class)
  public ResponseEntity<String> handleAuthorizationDeniedException(
      AuthorizationDeniedException exception) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
  }

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<String> handleNoSuchElementException(NoSuchElementException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Element not found");
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    ConstraintViolationException.class,
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class
  })
  public ResponseEntity<String> handleBadRequestException(Exception exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(exception.getMessage());
  }

  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<String> handleConflictException(ConflictException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(exception.getMessage());
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<String> handleDataIntegrityViolationException(
      DataIntegrityViolationException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body("Data conflict");
  }

  @ExceptionHandler(JWTVerificationException.class)
  public ResponseEntity<String> handleJwtVerificationException(JWTVerificationException exception) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<String> handleException(Exception exception) {
    log.error("Unhandled request error", exception);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error handling request");
  }
}
