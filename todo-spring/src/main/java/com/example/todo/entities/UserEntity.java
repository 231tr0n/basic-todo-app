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
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
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
  @Size(min = 1, max = 255)
  @Column(nullable = false, unique = true)
  private String username;

  @NotNull
  @Size(min = 1, max = 255)
  @Column(nullable = false)
  @JsonIgnore
  private String password;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private Set<RoleEntity> roles;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  @JsonIgnore
  private Set<TodoEntity> todos;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private boolean enabled;

  @NotNull
  @Column(nullable = false)
  @JsonIgnore
  private boolean loggedOut;

  @Transient @JsonIgnore private Set<GrantedAuthority> authorities;
  @Transient @JsonIgnore private boolean accountNonExpired;
  @Transient @JsonIgnore private boolean accountNonLocked;
  @Transient @JsonIgnore private boolean credentialsNonExpired;

  @NotNull
  @Override
  public Set<GrantedAuthority> getAuthorities() {
    return new HashSet<>(getRoles())
        .stream()
            .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(role.toString()))
            .collect(Collectors.toSet());
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }
}
