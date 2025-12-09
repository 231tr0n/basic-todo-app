package com.example.todo.services;

import com.example.todo.dtos.SignInDto;
import com.example.todo.dtos.SignUpDto;
import com.example.todo.entities.RoleEntity;
import com.example.todo.entities.UserEntity;
import com.example.todo.enums.RoleEnum;
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
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class AuthenticationService implements UserDetailsService {
  @NonNull private final JwtService jwtService;

  @NonNull private final UserRepository userRepository;

  @NonNull private final BCryptPasswordEncoder passwordEncoder;

  @NonNull private final AuthenticationManager authenticationManager;

  @NonNull private final SecurityContextLogoutHandler securityContextLogoutHandler;

  @Override
  public UserEntity loadUserByUsername(String username) {
    return userRepository.findByUsername(username);
  }

  public UserEntity signUp(SignUpDto signUpDto) throws Exception {
    if (userRepository.findByUsername(signUpDto.getUsername()) != null) {
      throw new Exception("Username already exists");
    }
    UserEntity userEntity = new UserEntity();
    userEntity.setUsername(signUpDto.getUsername());
    userEntity.setPassword(passwordEncoder.encode(signUpDto.getPassword()));
    userEntity.setEnabled(true);

    Set<RoleEntity> roles = new HashSet<>();
    for (RoleEnum role : signUpDto.getRoles()) {
      RoleEntity roleEntity = new RoleEntity();
      roleEntity.setRole(role);
      roleEntity.setUser(userEntity);
      roles.add(roleEntity);
    }
    userEntity.setRoles(roles);

    userRepository.save(userEntity);

    return userEntity;
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
      return;
    }
    UserEntity user =
        (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    user.setLoggedOut(true);
    userRepository.save(user);
    SecurityContextHolder.clearContext();
  }
}
