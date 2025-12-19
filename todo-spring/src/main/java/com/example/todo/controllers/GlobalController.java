package com.example.todo.controllers;

import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
import com.example.todo.dtos.UpdateTodoDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.UserEntity;
import com.example.todo.services.GlobalService;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
  public UserEntity getUser() {
    return globalService.getUser();
  }

  @PutMapping("/user")
  public void updateUser(@Valid @RequestBody UpdateUserDto updateUserDto) {
    globalService.updateUser(updateUserDto);
  }

  @PatchMapping("/user")
  public void patchUser(@Valid @RequestBody PatchUserDto patchUserDto) {
    globalService.patchUser(patchUserDto);
  }

  @DeleteMapping("/user")
  public String deleteUser(HttpServletResponse response) {
    globalService.deleteUser();
    response.addCookie(sessionCookieService.deleteSessionCookie());
    return "redirect:/";
  }

  @PostMapping("/todos")
  public void createTodo(@Valid @RequestBody CreateTodoDto createTodoDto) {
    globalService.createTodo(createTodoDto);
  }

  @GetMapping("/todos")
  public List<TodoEntity> getTodo() {
    return globalService.getTodo();
  }

  @PutMapping("/todos/{id}")
  public void updateTodo(@PathVariable long id, @Valid @RequestBody UpdateTodoDto updateTodoDto) {
    globalService.updateTodo(id, updateTodoDto);
  }

  @PatchMapping("/todos/{id}")
  public void patchTodo(@PathVariable long id, @Valid @RequestBody PatchTodoDto patchTodoDto) {
    globalService.patchTodo(id, patchTodoDto);
  }

  @DeleteMapping("/todos/{id}")
  public void deleteTodo(@PathVariable long id) {
    globalService.deleteTodo(id);
  }

  @PostMapping("/signin")
  public UserEntity signIn(@Valid @RequestBody SignInDto signInDto, HttpServletResponse response) {
    UserEntity user = globalService.signIn(signInDto);
    response.addCookie(sessionCookieService.generateSessionCookie(jwtService.generateJwt(user)));
    return user;
  }

  @PostMapping("/signup")
  public String signUp(@Valid @RequestBody SignUpDto signUpDto) {
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
