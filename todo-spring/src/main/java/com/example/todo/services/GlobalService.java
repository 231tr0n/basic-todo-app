package com.example.todo.services;

import com.example.todo.constants.Constants;
import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
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
import java.util.List;
import java.util.NoSuchElementException;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class GlobalService {
  @NonNull private final JwtService jwtService;
  @NonNull private final UserRepository userRepository;
  @NonNull private final AuthorityRepository authorityRepository;
  @NonNull private final TodoRepository todoRepository;
  @NonNull private final BCryptPasswordEncoder passwordEncoder;
  @NonNull private final AuthenticationManager authenticationManager;

  public static void isAdminOrThrow(UserEntity user) {
    if (!user.getAuthorities().stream()
        .map(authorityEntity -> authorityEntity.getAuthority())
        .toList()
        .contains(Constants.ADMIN_AUTHORITY)) {
      throw new AuthorizationDeniedException("User is not authorized");
    }
  }

  public void notExistsUsernameOrThrow(String username) {
    if (userRepository.findByUsername(username) == null) {
      throw new IllegalArgumentException("Username already exists");
    }
  }

  @Transactional
  @CircuitBreaker(name = "todo")
  public void signUp(SignUpDto signUpDto) {
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

  public UserEntity signIn(SignInDto signInDto) {
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
  public void updateUser(long userId, UpdateUserDto updateUserDto) {
    UserEntity user = getUser(userId);
    if (updateUserDto.getUsername() != null) {
      notExistsUsernameOrThrow(updateUserDto.getUsername());
      user.setUsername(updateUserDto.getUsername());
    }
    userRepository.save(user);
    if (updateUserDto.getAuthorities() != null) {
      authorityRepository.deleteAllByUserId(user.getId());
      for (String authority : updateUserDto.getAuthorities()) {
        AuthorityEntity authorityEntity = new AuthorityEntity();
        authorityEntity.setAuthority(authority);
        authorityEntity.setUser(user);
        authorityRepository.save(authorityEntity);
      }
    }
  }

  public void patchUser(long userId, PatchUserDto patchUserDto) {
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
  public void createUserTodo(long userId, CreateTodoDto createTodoDto) {
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

  public void updateUserTodo(long userId, long todoId, UpdateTodoDto updateTodoDto) {
    TodoEntity todo = getUserTodo(userId, todoId);
    if (updateTodoDto.getTitle() != null) {
      todo.setTitle(updateTodoDto.getTitle());
    }
    if (updateTodoDto.getDescription() != null) {
      todo.setDescription(updateTodoDto.getDescription());
    }
    todoRepository.save(todo);
  }

  public void patchUserTodo(long userId, long id, PatchTodoDto patchTodoDto) {
    TodoEntity todo = getUserTodo(userId, id);
    todo.setStatus(patchTodoDto.getStatus());
    todoRepository.save(todo);
  }

  public void deleteUserTodo(long userId, long id) {
    TodoEntity todo = getUserTodo(userId, id);
    todo.getUser().getTodos().remove(todo);
    todoRepository.delete(todo);
  }
}
