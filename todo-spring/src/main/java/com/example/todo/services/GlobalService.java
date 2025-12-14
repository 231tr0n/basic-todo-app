package com.example.todo.services;

import com.example.todo.dtos.CreateTodoDto;
import com.example.todo.dtos.PatchTodoDto;
import com.example.todo.dtos.PatchUserDto;
import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
import com.example.todo.dtos.UpdateTodoDto;
import com.example.todo.dtos.UpdateUserDto;
import com.example.todo.entities.RoleEntity;
import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.UserEntity;
import com.example.todo.enums.RoleEnum;
import com.example.todo.enums.StatusEnum;
import com.example.todo.repositories.RoleRepository;
import com.example.todo.repositories.TodoRepository;
import com.example.todo.repositories.UserRepository;
import java.util.HashSet;
import java.util.Set;
import lombok.NonNull;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.stereotype.Service;

@Service
public class GlobalService implements UserDetailsService {
  @NonNull private final JwtService jwtService;

  @NonNull private final UserRepository userRepository;

  @NonNull private final RoleRepository roleRepository;

  @NonNull private final TodoRepository todoRepository;

  @NonNull private final BCryptPasswordEncoder passwordEncoder;

  @NonNull private final AuthenticationManager authenticationManager;

  public GlobalService(
      JwtService jwtService,
      UserRepository userRepository,
      RoleRepository roleRepository,
      TodoRepository todoRepository,
      BCryptPasswordEncoder passwordEncoder,
      @Lazy AuthenticationManager authenticationManager) {
    this.jwtService = jwtService;
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.todoRepository = todoRepository;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
  }

  @Override
  public UserEntity loadUserByUsername(String username) {
    return userRepository.findByUsername(username);
  }

  public void signUp(SignUpDto signUpDto) {
    if (userRepository.findByUsername(signUpDto.getUsername()) != null) {
      throw new IllegalArgumentException("Username already exists");
    }
    UserEntity user = new UserEntity();
    user.setUsername(signUpDto.getUsername());
    user.setPassword(passwordEncoder.encode(signUpDto.getPassword()));
    user.setEnabled(true);
    user.setLoggedOut(true);
    Set<RoleEntity> roles = new HashSet<>();
    for (RoleEnum role : signUpDto.getRoles()) {
      RoleEntity roleEntity = new RoleEntity();
      roleEntity.setRole(role);
      roleEntity.setUser(user);
      roles.add(roleEntity);
    }
    user.setRoles(roles);
    userRepository.save(user);
  }

  public UserEntity signIn(SignInDto signInDto) {
    Authentication auth =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                signInDto.getUsername(), signInDto.getPassword()));
    UserEntity user = (UserEntity) auth.getPrincipal();
    user.setLoggedOut(false);
    userRepository.save(user);
    return (UserEntity) auth.getPrincipal();
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

  public void updateUser(UpdateUserDto updateUserDto) {
    UserEntity user = getUser();
    if (updateUserDto.getUsername() != null) {
      if (userRepository.findByUsername(updateUserDto.getUsername()) != null) {
        throw new IllegalArgumentException("Username already exists");
      }
      user.setUsername(updateUserDto.getUsername());
    }
    if (updateUserDto.getRoles() != null) {
      roleRepository.deleteAllByUser(user);
      Set<RoleEntity> roles = new HashSet<>();
      for (RoleEnum role : updateUserDto.getRoles()) {
        RoleEntity roleEntity = new RoleEntity();
        roleEntity.setRole(role);
        roleEntity.setUser(user);
        roles.add(roleEntity);
      }
      user.setRoles(roles);
    }
    userRepository.save(user);
  }

  public void patchUser(PatchUserDto patchUserDto) {
    UserEntity user = getUser();
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(user.getUsername(), patchUserDto.getOldPassword()));
    user.setPassword(passwordEncoder.encode(patchUserDto.getNewPassword()));
    userRepository.save(user);
  }

  public void deleteUser() {
    UserEntity user = getUser();
    todoRepository.deleteAllByUser(user);
    roleRepository.deleteAllByUser(user);
    userRepository.delete(user);
  }

  public void createTodo(CreateTodoDto createTodoDto) {
    UserEntity user = getUser();
    TodoEntity todo = new TodoEntity();
    todo.setTitle(createTodoDto.getTitle());
    todo.setDescription(createTodoDto.getDescription());
    todo.setStatus(StatusEnum.NOT_STARTED);
    todo.setUser(user);
    todoRepository.save(todo);
  }

  public Set<TodoEntity> getTodo() {
    UserEntity user = getUser();
    return user.getTodos();
  }

  public void updateTodo(UpdateTodoDto updateTodoDto) {
    UserEntity user = getUser();
    TodoEntity todo = todoRepository.findByIdAndUser(updateTodoDto.getId(), user).orElseThrow();
    if (updateTodoDto.getTitle() != null) {
      todo.setTitle(updateTodoDto.getTitle());
    }
    if (updateTodoDto.getDescription() != null) {
      todo.setDescription(updateTodoDto.getDescription());
    }
    todoRepository.save(todo);
  }

  public void patchTodo(PatchTodoDto patchTodoDto) {
    UserEntity user = getUser();
    TodoEntity todo = todoRepository.findByIdAndUser(patchTodoDto.getId(), user).orElseThrow();
    todo.setStatus(patchTodoDto.getStatus());
    todoRepository.save(todo);
  }

  public void deleteTodo(long id) {
    UserEntity user = getUser();
    TodoEntity todo = todoRepository.findByIdAndUser(id, user).orElseThrow();
    todoRepository.delete(todo);
  }
}
