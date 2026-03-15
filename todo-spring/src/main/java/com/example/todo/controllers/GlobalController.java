package com.example.todo.controllers;

import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.CreateUserDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.UpdateTodoDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.UserEntity;
import com.example.todo.services.GlobalService;
import com.example.todo.services.JwtService;
import com.example.todo.services.SessionCookieService;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
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
  private final GlobalService globalService;
  private final JwtService jwtService;
  private final SessionCookieService sessionCookieService;

  @GetMapping("/users/{userId}")
  public UserEntity getUser(@PathVariable long userId) {
    return globalService.getUser(userId);
  }

  @GetMapping("/users")
  public List<UserEntity> getUsers() {
    return globalService.getUsers();
  }

  @PostMapping("/signup")
  public void createUser(@RequestBody CreateUserDto signUpDto) {
    globalService.createUser(signUpDto);
  }

  @PutMapping("/users/{userId}")
  public void updateUser(
      @PathVariable long userId,
      @RequestBody UpdateUserDto updateUserDto,
      HttpServletResponse response) {
    globalService.updateUser(userId, updateUserDto);
    if (userId == 0
        || userId
                == ((UserEntity)
                        SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                    .getId()
            && updateUserDto.getUsername().isPresent()) {
      sessionCookieService.generateSessionCookie(
          response, jwtService.generateJwt(updateUserDto.getUsername().get()));
    }
  }

  @PatchMapping("/users/{userId}")
  public void patchUser(@PathVariable long userId, @RequestBody PatchUserDto patchUserDto) {
    globalService.patchUser(userId, patchUserDto);
  }

  @DeleteMapping("/users/{userId}")
  public void deleteUser(@PathVariable long userId, HttpServletResponse response) {
    globalService.deleteUser(userId);
    if (userId == 0
        || userId
            == ((UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .getId()) {
      sessionCookieService.deleteSessionCookie(response);
    }
  }

  @GetMapping("/users/{userId}/todos")
  public List<TodoEntity> getTodos(@PathVariable long userId) {
    return globalService.getUserTodos(userId);
  }

  @GetMapping("/users/{userId}/todos/{todoId}")
  public TodoEntity getTodo(@PathVariable long userId, @PathVariable long todoId) {
    return globalService.getUserTodo(userId, todoId);
  }

  @PostMapping("/users/{userId}/todos")
  public void createTodo(@PathVariable long userId, @RequestBody CreateTodoDto createTodoDto) {
    globalService.createUserTodo(userId, createTodoDto);
  }

  @PutMapping("/users/{userId}/todos/{todoId}")
  public void updateTodo(
      @PathVariable long userId,
      @PathVariable long todoId,
      @RequestBody UpdateTodoDto updateTodoDto) {
    globalService.updateUserTodo(userId, todoId, updateTodoDto);
  }

  @PatchMapping("/users/{userId}/todos/{todoId}")
  public void patchTodo(
      @PathVariable long userId,
      @PathVariable long todoId,
      @RequestBody PatchTodoDto patchTodoDto) {
    globalService.patchUserTodo(userId, todoId, patchTodoDto);
  }

  @DeleteMapping("/users/{userId}/todos/{todoId}")
  public void deleteTodo(@PathVariable long userId, @PathVariable long todoId) {
    globalService.deleteUserTodo(userId, todoId);
  }

  @DeleteMapping("/users/{userId}/todos")
  public void deleteTodos(@PathVariable long userId) {
    globalService.deleteUserTodos(userId);
  }

  @PostMapping("/signin")
  public void signIn(@RequestBody SignInDto signInDto, HttpServletResponse response) {
    globalService.signIn(signInDto);
    sessionCookieService.generateSessionCookie(
        response, jwtService.generateJwt(signInDto.getUsername()));
  }

  @PostMapping("/signout")
  public void signOut(HttpServletResponse response) {
    globalService.signOut();
    sessionCookieService.deleteSessionCookie(response);
  }
}
