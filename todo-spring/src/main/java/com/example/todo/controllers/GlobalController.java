package com.example.todo.controllers;

import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
import com.example.todo.entities.UserEntity;
import com.example.todo.services.GlobalService;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

  @GetMapping("/user")
  public void getUser() {}

  @PutMapping("/user")
  public void updateUser() {}

  @PatchMapping("/user")
  public void patchUser() {}

  @PostMapping("/todo")
  public void createTodo() {}

  @GetMapping("/todo")
  public void getTodo() {}

  @PutMapping("/todo")
  public void updateTodo() {}

  @PatchMapping("/todo")
  public void patchTodo() {}

  @PostMapping("/signin")
  public UserEntity signIn(@RequestBody SignInDto signInDto, HttpServletResponse response) {
    UserEntity user = globalService.signIn(signInDto);
    response.addCookie(sessionCookieService.generateSessionCookie(jwtService.generateJwt(user)));
    return user;
  }

  @PostMapping("/signup")
  public String signUp(@RequestBody SignUpDto signUpDto) {
    globalService.signUp(signUpDto);
    return "User registered successfully";
  }

  @PostMapping("/signout")
  public String signOut(HttpServletResponse response) {
    globalService.signOut();
    response.addCookie(sessionCookieService.deleteSessionCookie());
    return "redirect:/";
  }
}
