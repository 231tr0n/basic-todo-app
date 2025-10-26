package com.example.todo.entities;

import com.example.todo.enums.RoleEnum;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Set;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
@Getter
public class UserEntity implements UserDetails {
  @Id
  @NotNull
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @NotNull
  @Column(nullable = false, unique = true)
  private String username;

  @NotNull
  @Column(nullable = false)
  private String password;

  @NotNull
  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RoleEnum role;

  @JsonManagedReference
  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  private Set<TodoEntity> todos;

  @Override
  public List<GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority(getRole().toString()));
  }
}
