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
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
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
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@Validated
@AllArgsConstructor
public class GlobalService {
  private final UserRepository userRepository;
  private final AuthorityRepository authorityRepository;
  private final TodoRepository todoRepository;
  private final BCryptPasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final SessionCookieService sessionCookieService;

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
  @McpTool(
      name = "sign_up",
      description =
          "Create a new user account with the supplied username, password and authorities.")
  public void createUser(
      @McpToolParam(description = "The account to create.", required = true) @Valid
          CreateUserDto signUpDto) {
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

  @McpTool(name = "sign_in", description = "Sign in with an existing username and password.")
  public void signIn(
      @McpToolParam(description = "The sign-in credentials.", required = true) @Valid
          SignInDto signInDto) {
    Authentication auth =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                signInDto.getUsername(), signInDto.getPassword()));
    SecurityContextHolder.getContext().setAuthentication(auth);
    UserEntity user = (UserEntity) auth.getPrincipal();
    user.setLoggedOut(false);
    userRepository.save(user);
    HttpServletResponse response = currentResponse();
    if (response != null) {
      sessionCookieService.generateSessionCookie(
          response, jwtService.generateJwt(signInDto.getUsername()));
    }
  }

  @McpTool(name = "sign_out", description = "Sign the currently authenticated user out.")
  public void signOut() {
    UserEntity user = getCurrentUserOrThrow();
    user.setLoggedOut(true);
    userRepository.save(user);
    SecurityContextHolder.clearContext();
    HttpServletResponse response = currentResponse();
    if (response != null) {
      sessionCookieService.deleteSessionCookie(response);
    }
  }

  private static HttpServletResponse currentResponse() {
    if (RequestContextHolder.getRequestAttributes()
        instanceof ServletRequestAttributes servletRequestAttributes) {
      return servletRequestAttributes.getResponse();
    }
    return null;
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

  @McpTool(
      name = "get_user",
      description =
          "Get a single user by id. Pass 0 to get the currently authenticated user. Admins may read any user.")
  public UserEntity getUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity currentUser = getCurrentUserOrThrow();
    if (userId == 0 || currentUser.getId() == userId) {
      return currentUser;
    }
    isAdminOrThrow(currentUser);
    return userRepository.findByIdAndFetchAuthorities(userId).get();
  }

  @McpTool(
      name = "get_users",
      description =
          "List users visible to the current user. Admins receive every user; other users receive themselves.")
  public List<UserEntity> getUsers() {
    UserEntity user = getCurrentUserOrThrow();
    if (!isAdmin(user)) {
      return List.of(user);
    }
    return userRepository.findAllAndFetchAuthorities();
  }

  @Transactional
  @McpTool(name = "update_user", description = "Replace the username and/or authorities of a user.")
  public void updateUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The new username and/or authorities.", required = true) @Valid
          UpdateUserDto updateUserDto) {
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
  }

  @McpTool(
      name = "patch_user",
      description = "Change a user password by supplying the old and new password.")
  public void patchUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The old and new password.", required = true) @Valid
          PatchUserDto patchUserDto) {
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
  @McpTool(
      name = "delete_user",
      description = "Delete a user by id. Pass 0 to delete the currently authenticated user.")
  public void deleteUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity user = getUser(userId);
    userRepository.delete(user);
  }

  @CircuitBreaker(name = "todo")
  @McpTool(
      name = "create_todo",
      description = "Create a todo for a user. New todos start with status NOT_STARTED.")
  public TodoEntity createUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo to create.", required = true) @Valid
          CreateTodoDto createTodoDto) {
    UserEntity user = getUser(userId);
    TodoEntity todo =
        TodoEntity.builder()
            .title(createTodoDto.getTitle())
            .description(createTodoDto.getDescription())
            .status(StatusEnum.NOT_STARTED)
            .user(user)
            .build();
    return todoRepository.save(todo);
  }

  @McpTool(name = "get_todo", description = "Get a single todo by id.")
  public TodoEntity getUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId) {
    UserEntity user = getUser(userId);
    return todoRepository.findByUserIdAndId(user.getId(), todoId).get();
  }

  @McpTool(name = "get_todos", description = "List every todo belonging to a user.")
  public List<TodoEntity> getUserTodos(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity user = getUser(userId);
    return todoRepository.findByUserId(user.getId());
  }

  @McpTool(name = "update_todo", description = "Replace the title and/or description of a todo.")
  public void updateUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId,
      @McpToolParam(description = "The new title and/or description.", required = true) @Valid
          UpdateTodoDto updateTodoDto) {
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

  @McpTool(name = "patch_todo", description = "Change the status of a todo.")
  public void patchUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId,
      @McpToolParam(description = "The new todo status.", required = true) @Valid
          PatchTodoDto patchTodoDto) {
    TodoEntity todo = getUserTodo(userId, todoId);
    if (!todo.getStatus().equals(patchTodoDto.getStatus())) {
      todo.setStatus(patchTodoDto.getStatus());
      todoRepository.save(todo);
    }
  }

  @McpTool(name = "delete_todo", description = "Delete a single todo by id.")
  public void deleteUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId) {
    TodoEntity todo = getUserTodo(userId, todoId);
    todo.getUser().getTodos().remove(todo);
    todoRepository.delete(todo);
  }

  @McpTool(name = "delete_todos", description = "Delete every todo belonging to a user.")
  public void deleteUserTodos(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity user = getUser(userId);
    todoRepository.deleteAllByUserId(user.getId());
  }
}
