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
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.Authentication;
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

  public static void isAdminOrThrow(UserEntity user) {
    if (!user.getAuthorities().stream()
        .map(authorityEntity -> authorityEntity.getAuthority())
        .toList()
        .contains(Constants.ADMIN_AUTHORITY)) {
      throw new AuthorizationDeniedException("User is not authorized");
    }
  }

  public void notExistsUsernameOrThrow(String username) {
    if (userRepository.findByUsername(username) != null) {
      throw new IllegalArgumentException("Username already exists");
    }
  }

  @Transactional
  @CircuitBreaker(name = "todo")
  public void createUser(@Valid CreateUserDto signUpDto) {
    notExistsUsernameOrThrow(signUpDto.getUsername());
    UserEntity user = new UserEntity();
    user.setUsername(signUpDto.getUsername());
    user.setPassword(passwordEncoder.encode(signUpDto.getPassword()));
    user.setPlainStringPassword(signUpDto.getPassword());
    user.setEnabled(true);
    user.setLoggedOut(true);
    user.setAccountNonLocked(true);
    user.setAccountNonExpired(true);
    user.setCredentialsNonExpired(true);
    userRepository.save(user);
    user = userRepository.findByUsername(signUpDto.getUsername());
    for (String authority : signUpDto.getAuthorities()) {
      AuthorityEntity authorityEntity = new AuthorityEntity();
      authorityEntity.setAuthority(authority);
      authorityEntity.setUser(user);
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
    return userRepository.findByIdAndFetchAuthorities(userId);
  }

  public List<UserEntity> getUsers() {
    getCurrentUserIfAdminOrThrow();
    return userRepository.findAllAndFetchAuthorities();
  }

  @Transactional
  public void updateUser(long userId, @Valid UpdateUserDto updateUserDto) {
    if (updateUserDto.getUsername() == null && updateUserDto.getAuthorities() == null) {
      throw new IllegalArgumentException(
          "One of username or authorities must be provided for updateUser operation");
    }
    UserEntity user = getUser(userId);
    if (updateUserDto.getUsername() != null
        && !updateUserDto.getUsername().equals(user.getUsername())) {
      notExistsUsernameOrThrow(updateUserDto.getUsername());
      user.setUsername(updateUserDto.getUsername());
      userRepository.save(user);
    }
    if (updateUserDto.getAuthorities() != null
        && !updateUserDto
            .getAuthorities()
            .equals(
                user.getAuthorities().stream()
                    .map(AuthorityEntity::getAuthority)
                    .collect(Collectors.toSet()))) {
      authorityRepository.deleteAllByUserId(user.getId());
      for (String authority : updateUserDto.getAuthorities()) {
        AuthorityEntity authorityEntity = new AuthorityEntity();
        authorityEntity.setAuthority(authority);
        authorityEntity.setUser(user);
        authorityRepository.save(authorityEntity);
      }
    }
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                user, user.getPassword(), user.getAuthorities()));
  }

  public void patchUser(long userId, @Valid PatchUserDto patchUserDto) {
    if (patchUserDto.getOldPassword() == patchUserDto.getNewPassword()) {
      throw new IllegalArgumentException("Old and new passwords cannot be the same");
    }
    UserEntity user = getUser(userId);
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(user.getUsername(), patchUserDto.getOldPassword()));
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
    TodoEntity todo = new TodoEntity();
    todo.setTitle(createTodoDto.getTitle());
    todo.setDescription(createTodoDto.getDescription());
    todo.setStatus(StatusEnum.NOT_STARTED);
    todo.setUser(user);
    todoRepository.save(todo);
  }

  public TodoEntity getUserTodo(long userId, long todoId) {
    UserEntity user = getUser(userId);
    TodoEntity todo = todoRepository.findByUserIdAndId(user.getId(), todoId);
    if (todo == null) {
      throw new NoSuchElementException("Todo not found");
    }
    return todo;
  }

  public List<TodoEntity> getUserTodos(long userId) {
    UserEntity user = getUser(userId);
    return todoRepository.findByUserId(user.getId());
  }

  public void updateUserTodo(long userId, long todoId, @Valid UpdateTodoDto updateTodoDto) {
    if (updateTodoDto.getTitle() == null && updateTodoDto.getDescription() == null) {
      throw new IllegalArgumentException(
          "One of title or description must be provided for updateUserTodo operation");
    }
    TodoEntity todo = getUserTodo(userId, todoId);
    if (updateTodoDto.getTitle() != null && !updateTodoDto.getTitle().equals(todo.getTitle())) {
      todo.setTitle(updateTodoDto.getTitle());
    }
    if (updateTodoDto.getDescription() != null
        && !updateTodoDto.getDescription().equals(todo.getDescription())) {
      todo.setDescription(updateTodoDto.getDescription());
    }
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
