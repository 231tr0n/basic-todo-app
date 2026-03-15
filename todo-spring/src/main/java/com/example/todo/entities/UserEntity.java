package com.example.todo.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.springframework.security.core.userdetails.UserDetails;

@Entity
@Table(name = "users")
@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
@OnDelete(action = OnDeleteAction.CASCADE)
public class UserEntity implements UserDetails {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, unique = true)
  private long id;

  @Column(nullable = false, unique = true, length = 255)
  private String username;

  @Column(nullable = false, length = 255)
  @JsonIgnore
  private String password;

  @Column(nullable = false, length = 255)
  private String plainStringPassword;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  private List<AuthorityEntity> authorities;

  @JsonManagedReference
  @OneToMany(
      mappedBy = "user",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  @JsonIgnore
  private List<TodoEntity> todos;

  @JsonIgnore
  @Column(nullable = false)
  private boolean enabled;

  @Column(nullable = false)
  @JsonIgnore
  private boolean loggedOut;

  @JsonIgnore
  @Column(nullable = false)
  private boolean accountNonExpired;

  @JsonIgnore
  @Column(nullable = false)
  private boolean accountNonLocked;

  @JsonIgnore
  @Column(nullable = false)
  private boolean credentialsNonExpired;
}
