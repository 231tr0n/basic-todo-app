package com.example.todo.services;

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

  @Transactional
  @CircuitBreaker(name = "todo")
  public void signUp(SignUpDto signUpDto) {
    if (userRepository.findByUsername(signUpDto.getUsername()) != null) {
      throw new IllegalArgumentException("Username already exists");
    }
    UserEntity user = new UserEntity();
    user.setUsername(signUpDto.getUsername());
    user.setPassword(passwordEncoder.encode(signUpDto.getPassword()));
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
    UserEntity user = getUser();
    user.setLoggedOut(true);
    userRepository.save(user);
    SecurityContextHolder.clearContext();
  }

  public UserEntity getUser() {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      throw new SessionAuthenticationException("User is not authenticated");
    }
    return (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
  }

  @Transactional
  public void updateUser(UpdateUserDto updateUserDto) {
    UserEntity user = getUser();
    if (updateUserDto.getUsername() != null) {
      if (userRepository.findByUsername(updateUserDto.getUsername()) != null) {
        throw new IllegalArgumentException("Username already exists");
      }
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

  public void patchUser(PatchUserDto patchUserDto) {
    UserEntity user = getUser();
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(user.getUsername(), patchUserDto.getOldPassword()));
    user.setPassword(passwordEncoder.encode(patchUserDto.getNewPassword()));
    userRepository.save(user);
  }

  @Transactional
  public void deleteUser() {
    UserEntity user = getUser();
    todoRepository.deleteAllByUserId(user.getId());
    authorityRepository.deleteAllByUserId(user.getId());
    userRepository.deleteById(user.getId());
  }

  @CircuitBreaker(name = "todo")
  public void createTodo(CreateTodoDto createTodoDto) {
    UserEntity user = getUser();
    TodoEntity todo = new TodoEntity();
    todo.setTitle(createTodoDto.getTitle());
    todo.setDescription(createTodoDto.getDescription());
    todo.setStatus(StatusEnum.NOT_STARTED);
    todo.setUser(user);
    todoRepository.save(todo);
  }

  public List<TodoEntity> getTodo() {
    UserEntity user = getUser();
    return todoRepository.findByUserId(user.getId());
  }

  public void updateTodo(long id, UpdateTodoDto updateTodoDto) {
    UserEntity user = getUser();
    TodoEntity todo = todoRepository.findByIdAndUserId(id, user.getId());
    if (todo == null) {
      throw new NoSuchElementException("Todo not found");
    }
    if (updateTodoDto.getTitle() != null) {
      todo.setTitle(updateTodoDto.getTitle());
    }
    if (updateTodoDto.getDescription() != null) {
      todo.setDescription(updateTodoDto.getDescription());
    }
    todoRepository.save(todo);
  }

  public void patchTodo(long id, PatchTodoDto patchTodoDto) {
    UserEntity user = getUser();
    TodoEntity todo = todoRepository.findByIdAndUserId(id, user.getId());
    if (todo == null) {
      throw new NoSuchElementException("Todo not found");
    }
    todo.setStatus(patchTodoDto.getStatus());
    todoRepository.save(todo);
  }

  public void deleteTodo(long id) {
    UserEntity user = getUser();
    TodoEntity todo = todoRepository.findByIdAndUserId(id, user.getId());
    if (todo == null) {
      throw new NoSuchElementException("Todo not found");
    }
    todoRepository.deleteById(todo.getId());
  }
}
