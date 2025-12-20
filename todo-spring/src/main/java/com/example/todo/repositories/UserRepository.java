package com.example.todo.repositories;

import com.example.todo.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  UserEntity findByUsername(String username);

  @Query("SELECT u FROM UserEntity u JOIN FETCH u.authorities WHERE u.username = :username")
  UserEntity findByUsernameAndFetchAuthorities(String username);

  boolean existsByUsername(String username);
}
