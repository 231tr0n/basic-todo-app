package com.example.todo.controllers;

import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
import com.example.todo.services.GlobalService;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@AllArgsConstructor
public class GlobalController {
  @NonNull private final GlobalService globalService;

  @NonNull private final JwtService jwtService;

  @NonNull private final SessionCookieService sessionCookieService;

  @PostMapping("/signin")
  public void signIn(@RequestBody SignInDto signInDto, HttpServletResponse response) {
    response.addCookie(
        sessionCookieService.generateSessionCookie(
            jwtService.generateJwt(globalService.signIn(signInDto))));
  }

  @PostMapping("/signup")
  public ResponseEntity<String> signUp(@RequestBody SignUpDto signUpDto) {
    try {
      globalService.signUp(signUpDto);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(e.getMessage());
    }
    return ResponseEntity.ok("User registered successfully");
  }

  @PostMapping("/signout")
  public void signOut(HttpServletResponse response) {
    globalService.signOut();
    response.addCookie(sessionCookieService.deleteSessionCookie());
  }
}
