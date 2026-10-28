package com.example.todo.services;

import com.example.todo.constants.Constants;
import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.CreateUserDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.TodoResponseDto;
import com.example.todo.dtos.UpdateTodoDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.dtos.UserResponseDto;
import com.example.todo.entities.AuthorityEntity;
import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.TodoEntity.StatusEnum;
import com.example.todo.entities.UserEntity;
import com.example.todo.exceptions.ConflictException;
import com.example.todo.repositories.TodoRepository;
import com.example.todo.repositories.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
public class GlobalService {
  private static final Set<String> ALLOWED_AUTHORITIES = Set.of(Constants.ADMIN_AUTHORITY);

  private final UserRepository userRepository;
  private final TodoRepository todoRepository;
  private final BCryptPasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final SessionCookieService sessionCookieService;

  public static boolean isAdmin(@NonNull UserEntity user) {
    return user.getAuthorities().stream()
        .anyMatch(authority -> Constants.ADMIN_AUTHORITY.equals(authority.getAuthority()));
  }

  public static void isAdminOrThrow(@NonNull UserEntity user) {
    if (!isAdmin(user)) {
      throw new AuthorizationDeniedException("User is not authorized");
    }
  }

  private void ensureUsernameAvailable(@NonNull String username) {
    if (userRepository.findByUsername(username).isPresent()) {
      throw new ConflictException("Username already exists");
    }
  }

  private static void ensureKnownAuthorities(Set<String> authorities) {
    if (!ALLOWED_AUTHORITIES.containsAll(authorities)) {
      throw new IllegalArgumentException("Unknown authority");
    }
  }

  private void ensureSelfRegistrationCanAssignAdmin(Set<String> authorities) {
    if (authorities.contains(Constants.ADMIN_AUTHORITY) && userRepository.count() > 0) {
      throw new AuthorizationDeniedException(
          "Only the first account can assign itself the ADMIN authority");
    }
  }

  @Transactional
  @McpTool(
      name = "sign_up",
      description =
          "Create a new user account with the supplied username, password and authorities.")
  public void createUser(
      @McpToolParam(description = "The account to create.", required = true) @Valid
          CreateUserDto createUserDto) {
    ensureUsernameAvailable(createUserDto.getUsername());
    ensureKnownAuthorities(createUserDto.getAuthorities());
    ensureSelfRegistrationCanAssignAdmin(createUserDto.getAuthorities());
    UserEntity user =
        UserEntity.builder()
            .username(createUserDto.getUsername())
            .password(passwordEncoder.encode(createUserDto.getPassword()))
            .build();
    for (String authority : createUserDto.getAuthorities()) {
      user.getAuthorities().add(AuthorityEntity.builder().authority(authority).user(user).build());
    }
    userRepository.save(user);
  }

  @Transactional
  @McpTool(name = "sign_in", description = "Sign in with an existing username and password.")
  public void signIn(
      @McpToolParam(description = "The sign-in credentials.", required = true) @Valid
          SignInDto signInDto) {
    Authentication authentication =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                signInDto.getUsername(), signInDto.getPassword()));
    SecurityContextHolder.getContext().setAuthentication(authentication);
    UserEntity user = (UserEntity) authentication.getPrincipal();
    user.setLoggedOut(false);
    userRepository.save(user);
    refreshSessionCookie(signInDto.getUsername());
  }

  @Transactional
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

  private void refreshSessionCookie(String username) {
    HttpServletResponse response = currentResponse();
    if (response != null) {
      sessionCookieService.generateSessionCookie(response, jwtService.generateJwt(username));
    }
  }

  private static HttpServletResponse currentResponse() {
    if (RequestContextHolder.getRequestAttributes()
        instanceof ServletRequestAttributes servletRequestAttributes) {
      return servletRequestAttributes.getResponse();
    }
    return null;
  }

  private UserEntity getCurrentUserOrThrow() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null && authentication.getPrincipal() instanceof UserEntity user) {
      return user;
    }
    throw new SessionAuthenticationException("User is not authenticated");
  }

  private UserEntity resolveUser(long userId) {
    UserEntity currentUser = getCurrentUserOrThrow();
    if (userId != 0 && userId != currentUser.getId()) {
      isAdminOrThrow(currentUser);
    }
    long resolvedId = userId == 0 ? currentUser.getId() : userId;
    return userRepository
        .findByIdAndFetchAuthorities(resolvedId)
        .orElseThrow(() -> new NoSuchElementException("User not found"));
  }

  private TodoEntity resolveTodo(UserEntity user, long todoId) {
    return todoRepository
        .findByUserIdAndId(user.getId(), todoId)
        .orElseThrow(() -> new NoSuchElementException("Todo not found"));
  }

  @Transactional(readOnly = true)
  @McpTool(
      name = "get_user",
      description =
          "Get a single user by id. Pass 0 to get the currently authenticated user. Admins may read any user.")
  public UserResponseDto getUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    return UserResponseDto.from(resolveUser(userId));
  }

  @Transactional(readOnly = true)
  @McpTool(
      name = "get_users",
      description =
          "List users visible to the current user. Admins receive every user; other users receive themselves.")
  public List<UserResponseDto> getUsers() {
    UserEntity currentUser = getCurrentUserOrThrow();
    if (!isAdmin(currentUser)) {
      return List.of(UserResponseDto.from(currentUser));
    }
    return userRepository.findAllAndFetchAuthorities().stream().map(UserResponseDto::from).toList();
  }

  @Transactional
  @McpTool(name = "update_user", description = "Replace the username and/or authorities of a user.")
  public void updateUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The new username and/or authorities.", required = true) @Valid
          UpdateUserDto updateUserDto) {
    String username = updateUserDto.getUsername();
    Set<String> authorities = updateUserDto.getAuthorities();
    if (username == null && authorities == null) {
      throw new IllegalArgumentException(
          "One of username or authorities must be provided for updateUser operation");
    }
    UserEntity currentUser = getCurrentUserOrThrow();
    if (authorities != null) {
      isAdminOrThrow(currentUser);
      ensureKnownAuthorities(authorities);
    }
    UserEntity user = resolveUser(userId);
    if (username != null && !username.equals(user.getUsername())) {
      ensureUsernameAvailable(username);
      user.setUsername(username);
    }
    if (authorities != null) {
      replaceAuthorities(user, authorities);
    }
    if (user.getId() == currentUser.getId() && username != null) {
      refreshSessionCookie(username);
    }
  }

  private static void replaceAuthorities(UserEntity user, Set<String> authorities) {
    user.getAuthorities().removeIf(authority -> !authorities.contains(authority.getAuthority()));
    Set<String> existingAuthorities =
        user.getAuthorities().stream()
            .map(AuthorityEntity::getAuthority)
            .collect(Collectors.toSet());
    for (String authority : authorities) {
      if (existingAuthorities.add(authority)) {
        user.getAuthorities()
            .add(AuthorityEntity.builder().authority(authority).user(user).build());
      }
    }
  }

  @Transactional
  @McpTool(
      name = "patch_user",
      description = "Change a user password by supplying the old and new password.")
  public void patchUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The old and new password.", required = true) @Valid
          PatchUserDto patchUserDto) {
    if (patchUserDto.getOldPassword().equals(patchUserDto.getNewPassword())) {
      throw new IllegalArgumentException("Old and new passwords cannot be the same");
    }
    UserEntity user = resolveUser(userId);
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(
              user.getUsername(), patchUserDto.getOldPassword()));
    } catch (AuthenticationException _) {
      throw new IllegalArgumentException("Old password is incorrect");
    }
    user.setPassword(passwordEncoder.encode(patchUserDto.getNewPassword()));
  }

  @Transactional
  @McpTool(
      name = "delete_user",
      description = "Delete a user by id. Pass 0 to delete the currently authenticated user.")
  public void deleteUser(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity user = resolveUser(userId);
    long currentUserId = getCurrentUserOrThrow().getId();
    long deletedUserId = user.getId();
    userRepository.delete(user);
    if (deletedUserId == currentUserId) {
      HttpServletResponse response = currentResponse();
      if (response != null) {
        sessionCookieService.deleteSessionCookie(response);
      }
    }
  }

  @Transactional
  @McpTool(
      name = "create_todo",
      description = "Create a todo for a user. New todos start with status NOT_STARTED.")
  public TodoResponseDto createUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo to create.", required = true) @Valid
          CreateTodoDto createTodoDto) {
    UserEntity user = resolveUser(userId);
    TodoEntity todo =
        TodoEntity.builder()
            .title(createTodoDto.getTitle())
            .description(createTodoDto.getDescription())
            .status(StatusEnum.NOT_STARTED)
            .user(user)
            .build();
    return TodoResponseDto.from(todoRepository.save(todo));
  }

  @Transactional(readOnly = true)
  @McpTool(name = "get_todo", description = "Get a single todo by id.")
  public TodoResponseDto getUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId) {
    return TodoResponseDto.from(resolveTodo(resolveUser(userId), todoId));
  }

  @Transactional(readOnly = true)
  @McpTool(name = "get_todos", description = "List every todo belonging to a user.")
  public List<TodoResponseDto> getUserTodos(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity user = resolveUser(userId);
    return todoRepository.findByUserId(user.getId()).stream().map(TodoResponseDto::from).toList();
  }

  @Transactional
  @McpTool(name = "update_todo", description = "Replace the title and/or description of a todo.")
  public void updateUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId,
      @McpToolParam(description = "The new title and/or description.", required = true) @Valid
          UpdateTodoDto updateTodoDto) {
    String title = updateTodoDto.getTitle();
    String description = updateTodoDto.getDescription();
    if (title == null && description == null) {
      throw new IllegalArgumentException(
          "One of title or description must be provided for updateUserTodo operation");
    }
    TodoEntity todo = resolveTodo(resolveUser(userId), todoId);
    if (title != null) {
      todo.setTitle(title);
    }
    if (description != null) {
      todo.setDescription(description);
    }
  }

  @Transactional
  @McpTool(name = "patch_todo", description = "Change the status of a todo.")
  public void patchUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId,
      @McpToolParam(description = "The new todo status.", required = true) @Valid
          PatchTodoDto patchTodoDto) {
    TodoEntity todo = resolveTodo(resolveUser(userId), todoId);
    todo.setStatus(patchTodoDto.getStatus());
  }

  @Transactional
  @McpTool(name = "delete_todo", description = "Delete a single todo by id.")
  public void deleteUserTodo(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId,
      @McpToolParam(description = "The todo id.", required = true) long todoId) {
    todoRepository.delete(resolveTodo(resolveUser(userId), todoId));
  }

  @Transactional
  @McpTool(name = "delete_todos", description = "Delete every todo belonging to a user.")
  public void deleteUserTodos(
      @McpToolParam(description = "The user id, or 0 for the current user.", required = true)
          long userId) {
    UserEntity user = resolveUser(userId);
    todoRepository.deleteAllByUserId(user.getId());
  }
}
