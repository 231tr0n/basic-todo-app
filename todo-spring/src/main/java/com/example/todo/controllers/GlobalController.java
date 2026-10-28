package com.example.todo.controllers;

import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.CreateUserDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.TodoResponseDto;
import com.example.todo.dtos.UpdateTodoDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.dtos.UserResponseDto;
import com.example.todo.services.GlobalService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GlobalController {
  private final GlobalService globalService;

  @GetMapping("/users/{userId}")
  public UserResponseDto getUser(@PathVariable long userId) {
    return globalService.getUser(userId);
  }

  @GetMapping("/users")
  public List<UserResponseDto> getUsers() {
    return globalService.getUsers();
  }

  @PostMapping("/signup")
  @ResponseStatus(HttpStatus.CREATED)
  public void createUser(@RequestBody @Valid CreateUserDto createUserDto) {
    globalService.createUser(createUserDto);
  }

  @PutMapping("/users/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void updateUser(
      @PathVariable long userId, @RequestBody @Valid UpdateUserDto updateUserDto) {
    globalService.updateUser(userId, updateUserDto);
  }

  @PatchMapping("/users/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void patchUser(@PathVariable long userId, @RequestBody @Valid PatchUserDto patchUserDto) {
    globalService.patchUser(userId, patchUserDto);
  }

  @DeleteMapping("/users/{userId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteUser(@PathVariable long userId) {
    globalService.deleteUser(userId);
  }

  @GetMapping("/users/{userId}/todos")
  public List<TodoResponseDto> getTodos(@PathVariable long userId) {
    return globalService.getUserTodos(userId);
  }

  @GetMapping("/users/{userId}/todos/{todoId}")
  public TodoResponseDto getTodo(@PathVariable long userId, @PathVariable long todoId) {
    return globalService.getUserTodo(userId, todoId);
  }

  @PostMapping("/users/{userId}/todos")
  @ResponseStatus(HttpStatus.CREATED)
  public TodoResponseDto createTodo(
      @PathVariable long userId, @RequestBody @Valid CreateTodoDto createTodoDto) {
    return globalService.createUserTodo(userId, createTodoDto);
  }

  @PutMapping("/users/{userId}/todos/{todoId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void updateTodo(
      @PathVariable long userId,
      @PathVariable long todoId,
      @RequestBody @Valid UpdateTodoDto updateTodoDto) {
    globalService.updateUserTodo(userId, todoId, updateTodoDto);
  }

  @PatchMapping("/users/{userId}/todos/{todoId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void patchTodo(
      @PathVariable long userId,
      @PathVariable long todoId,
      @RequestBody @Valid PatchTodoDto patchTodoDto) {
    globalService.patchUserTodo(userId, todoId, patchTodoDto);
  }

  @DeleteMapping("/users/{userId}/todos/{todoId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteTodo(@PathVariable long userId, @PathVariable long todoId) {
    globalService.deleteUserTodo(userId, todoId);
  }

  @DeleteMapping("/users/{userId}/todos")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteTodos(@PathVariable long userId) {
    globalService.deleteUserTodos(userId);
  }

  @PostMapping("/signin")
  public void signIn(@RequestBody @Valid SignInDto signInDto) {
    globalService.signIn(signInDto);
  }

  @PostMapping("/signout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void signOut() {
    globalService.signOut();
  }
}
