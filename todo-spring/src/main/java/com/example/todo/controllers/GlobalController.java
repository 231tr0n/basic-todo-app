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

  @GetMapping("/users/{userId}")
  public UserEntity getUser(@PathVariable long userId) {
    return globalService.getUser(userId);
  }

  @PostMapping("/users")
  public String createUser(@Valid @RequestBody SignUpDto signUpDto) {
    globalService.signUp(signUpDto);
    return "User registered successfully";
  }

  @PutMapping("/users/{userId}")
  public void updateUser(
      @PathVariable long userId, @Valid @RequestBody UpdateUserDto updateUserDto) {
    globalService.updateUser(userId, updateUserDto);
  }

  @PatchMapping("/users/{userId}")
  public void patchUser(@PathVariable long userId, @Valid @RequestBody PatchUserDto patchUserDto) {
    globalService.patchUser(userId, patchUserDto);
  }

  @DeleteMapping("/users/{userId}")
  public String deleteUser(@PathVariable long userId, HttpServletResponse response) {
    globalService.deleteUser(userId);
    response.addCookie(sessionCookieService.deleteSessionCookie());
    return "redirect:/";
  }

  @PostMapping("/users/{userId}/todos")
  public void createTodo(
      @PathVariable long userId, @Valid @RequestBody CreateTodoDto createTodoDto) {
    globalService.createUserTodo(userId, createTodoDto);
  }

  @GetMapping("/users/{userId}/todos")
  public List<TodoEntity> getTodos(@PathVariable long userId) {
    return globalService.getUserTodos(userId);
  }

  @GetMapping("/users/{userId}/todos/{todoId}")
  public TodoEntity getTodo(@PathVariable long userId, @PathVariable long todoId) {
    return globalService.getUserTodo(userId, todoId);
  }

  @PutMapping("/users/{userId}/todos/{todoId}")
  public void updateTodo(
      @PathVariable long userId,
      @PathVariable long todoId,
      @Valid @RequestBody UpdateTodoDto updateTodoDto) {
    globalService.updateUserTodo(userId, todoId, updateTodoDto);
  }

  @PatchMapping("/users/{userId}/todos/{todoId}")
  public void patchTodo(
      @PathVariable long userId,
      @PathVariable long todoId,
      @Valid @RequestBody PatchTodoDto patchTodoDto) {
    globalService.patchUserTodo(userId, todoId, patchTodoDto);
  }

  @DeleteMapping("/users/{userId}/todos/{todoId}")
  public void deleteTodo(@PathVariable long userId, @PathVariable long todoId) {
    globalService.deleteUserTodo(userId, todoId);
  }

  @PostMapping("/signin")
  public UserEntity signIn(@Valid @RequestBody SignInDto signInDto, HttpServletResponse response) {
    UserEntity user = globalService.signIn(signInDto);
    response.addCookie(sessionCookieService.generateSessionCookie(jwtService.generateJwt(user)));
    return user;
  }

  @PostMapping("/signout")
  public String signOut(HttpServletResponse response) {
    globalService.signOut();
    response.addCookie(sessionCookieService.deleteSessionCookie());
    return "redirect:/";
  }
}
