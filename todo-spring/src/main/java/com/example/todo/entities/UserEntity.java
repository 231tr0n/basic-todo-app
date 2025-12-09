package com.example.todo.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Set;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
@Data
public class UserEntity implements UserDetails {
  @Id
  @NotNull
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private long id;

  @NotNull
  @Column(nullable = false, unique = true)
  private String username;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private String password;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private Set<RoleEntity> roles;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private Set<TodoEntity> todos;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private boolean enabled;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private boolean loggedOut;

  @NotNull
  @Override
  public List<GrantedAuthority> getAuthorities() {
    return getRoles().stream()
        .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(role.toString()))
        .toList();
  }
}
