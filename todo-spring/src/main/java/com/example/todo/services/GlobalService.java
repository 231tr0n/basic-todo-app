package com.example.todo.services;

import com.example.todo.constants.Constants;
import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.CreateUserDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.UpdateTodoDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.entities.AuthorityEntity;
import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.TodoEntity.StatusEnum;
import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.AuthorityRepository;
import com.example.todo.repositories.TodoRepository;
import com.example.todo.repositories.UserRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@AllArgsConstructor
public class GlobalService {
  private final UserRepository userRepository;
  private final AuthorityRepository authorityRepository;
  private final TodoRepository todoRepository;
  private final BCryptPasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;

  public static boolean isAdmin(@NonNull UserEntity user) {
    return user.getAuthorities().stream()
        .map(authorityEntity -> authorityEntity.getAuthority())
        .toList()
        .contains(Constants.ADMIN_AUTHORITY);
  }

  public static void isAdminOrThrow(@NonNull UserEntity user) {
    if (!isAdmin(user)) {
      throw new AuthorizationDeniedException("User is not authorized");
    }
  }

  public void notExistsUsernameOrThrow(@NonNull String username) {
    if (userRepository.findByUsername(username).isPresent()) {
      throw new IllegalArgumentException("Username already exists");
    }
  }

  @Transactional
  @CircuitBreaker(name = "todo")
  public void createUser(@Valid CreateUserDto signUpDto) {
    notExistsUsernameOrThrow(signUpDto.getUsername());
    UserEntity user =
        UserEntity.builder()
            .username(signUpDto.getUsername())
            .password(passwordEncoder.encode(signUpDto.getPassword()))
            .plainStringPassword(signUpDto.getPassword())
            .enabled(true)
            .loggedOut(true)
            .accountNonLocked(true)
            .accountNonExpired(true)
            .credentialsNonExpired(true)
            .build();
    userRepository.save(user);
    user = userRepository.findByUsername(signUpDto.getUsername()).get();
    for (String authority : signUpDto.getAuthorities()) {
      AuthorityEntity authorityEntity =
          AuthorityEntity.builder().authority(authority).user(user).build();
      authorityRepository.save(authorityEntity);
    }
  }

  public UserEntity signIn(@Valid SignInDto signInDto) {
    Authentication auth =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                signInDto.getUsername(), signInDto.getPassword()));
    SecurityContextHolder.getContext().setAuthentication(auth);
    UserEntity user = (UserEntity) auth.getPrincipal();
    user.setLoggedOut(false);
    userRepository.save(user);
    return user;
  }

  public void signOut() {
    UserEntity user = getCurrentUserOrThrow();
    user.setLoggedOut(true);
    userRepository.save(user);
    SecurityContextHolder.clearContext();
  }

  public UserEntity getCurrentUserOrThrow() {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      throw new SessionAuthenticationException("User is not authenticated");
    }
    return (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
  }

  public UserEntity getCurrentUserIfAdminOrThrow() {
    UserEntity user = getCurrentUserOrThrow();
    isAdminOrThrow(user);
    return user;
  }

  public UserEntity getUser(long userId) {
    UserEntity currentUser = getCurrentUserOrThrow();
    if (userId == 0 || currentUser.getId() == userId) {
      return currentUser;
    }
    isAdminOrThrow(currentUser);
    return userRepository.findByIdAndFetchAuthorities(userId).get();
  }

  public List<UserEntity> getUsers() {
    UserEntity user = getCurrentUserOrThrow();
    if (!isAdmin(user)) {
      return List.of(user);
    }
    return userRepository.findAllAndFetchAuthorities();
  }

  @Transactional
  public UserEntity updateUser(long userId, @Valid UpdateUserDto updateUserDto) {
    if (updateUserDto.getUsername().isEmpty() && updateUserDto.getAuthorities().isEmpty()) {
      throw new IllegalArgumentException(
          "One of username or authorities must be provided for updateUser operation");
    }
    UserEntity user = getUser(userId);
    updateUserDto
        .getUsername()
        .ifPresent(
            (username) -> {
              if (!username.equals(user.getUsername())) {
                notExistsUsernameOrThrow(username);
                user.setUsername(username);
                userRepository.save(user);
              }
            });
    updateUserDto
        .getAuthorities()
        .ifPresent(
            (authorities) -> {
              if (!authorities.equals(
                  user.getAuthorities().stream()
                      .map(AuthorityEntity::getAuthority)
                      .collect(Collectors.toSet()))) {
                authorityRepository.deleteAllByUserId(user.getId());
                for (String authority : authorities) {
                  AuthorityEntity authorityEntity =
                      AuthorityEntity.builder().authority(authority).user(user).build();
                  authorityRepository.save(authorityEntity);
                }
              }
            });
    return user;
  }

  public void patchUser(long userId, @Valid PatchUserDto patchUserDto) {
    if (patchUserDto.getOldPassword() == patchUserDto.getNewPassword()) {
      throw new IllegalArgumentException("Old and new passwords cannot be the same");
    }
    UserEntity user = getUser(userId);
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(
              user.getUsername(), patchUserDto.getOldPassword()));
    } catch (AuthenticationException e) {
      throw new IllegalArgumentException("Old password is incorrect");
    }
    user.setPassword(passwordEncoder.encode(patchUserDto.getNewPassword()));
    user.setPlainStringPassword(patchUserDto.getNewPassword());
    userRepository.save(user);
  }

  @Transactional
  public void deleteUser(long userId) {
    UserEntity user = getUser(userId);
    userRepository.delete(user);
  }

  @CircuitBreaker(name = "todo")
  public void createUserTodo(long userId, @Valid CreateTodoDto createTodoDto) {
    UserEntity user = getUser(userId);
    TodoEntity todo =
        TodoEntity.builder()
            .title(createTodoDto.getTitle())
            .description(createTodoDto.getDescription())
            .status(StatusEnum.NOT_STARTED)
            .user(user)
            .build();
    todoRepository.save(todo);
  }

  public TodoEntity getUserTodo(long userId, long todoId) {
    UserEntity user = getUser(userId);
    return todoRepository.findByUserIdAndId(user.getId(), todoId).get();
  }

  public List<TodoEntity> getUserTodos(long userId) {
    UserEntity user = getUser(userId);
    return todoRepository.findByUserId(user.getId());
  }

  public void updateUserTodo(long userId, long todoId, @Valid UpdateTodoDto updateTodoDto) {
    if (updateTodoDto.getTitle().isEmpty() && updateTodoDto.getDescription().isEmpty()) {
      throw new IllegalArgumentException(
          "One of title or description must be provided for updateUserTodo operation");
    }
    TodoEntity todo = getUserTodo(userId, todoId);
    updateTodoDto
        .getTitle()
        .ifPresent(
            (title) -> {
              if (!title.equals(todo.getTitle())) {
                todo.setTitle(title);
              }
            });
    updateTodoDto
        .getDescription()
        .ifPresent(
            (description) -> {
              if (!description.equals(todo.getDescription())) {
                todo.setDescription(description);
              }
            });
    todoRepository.save(todo);
  }

  public void patchUserTodo(long userId, long todoId, @Valid PatchTodoDto patchTodoDto) {
    TodoEntity todo = getUserTodo(userId, todoId);
    if (!todo.getStatus().equals(patchTodoDto.getStatus())) {
      todo.setStatus(patchTodoDto.getStatus());
      todoRepository.save(todo);
    }
  }

  public void deleteUserTodo(long userId, long todoId) {
    TodoEntity todo = getUserTodo(userId, todoId);
    todo.getUser().getTodos().remove(todo);
    todoRepository.delete(todo);
  }

  public void deleteUserTodos(long userId) {
    UserEntity user = getUser(userId);
    todoRepository.deleteAllByUserId(user.getId());
  }
}
