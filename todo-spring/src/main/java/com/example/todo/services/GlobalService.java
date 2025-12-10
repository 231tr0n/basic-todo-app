package com.example.todo.services;

import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
import com.example.todo.entities.RoleEntity;
import com.example.todo.entities.UserEntity;
import com.example.todo.enums.RoleEnum;
import com.example.todo.repositories.RoleRepository;
import com.example.todo.repositories.TodoRepository;
import com.example.todo.repositories.UserRepository;
import java.util.HashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.authentication.session.SessionAuthenticationException;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class GlobalService implements UserDetailsService {
  @NonNull private final JwtService jwtService;

  @NonNull private final UserRepository userRepository;

  @NonNull private final RoleRepository roleRepository;

  @NonNull private final TodoRepository todoRepository;

  @NonNull private final BCryptPasswordEncoder passwordEncoder;

  @NonNull private final AuthenticationManager authenticationManager;

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
    return (UserEntity) auth.getPrincipal();
  }

  public void signOut() {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      throw new SessionAuthenticationException("User is not authenticated");
    }
    UserEntity user =
        (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    user.setLoggedOut(true);
    userRepository.save(user);
    SecurityContextHolder.clearContext();
  }
}
