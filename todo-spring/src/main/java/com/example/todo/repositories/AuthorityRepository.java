package com.example.todo.repositories;

import com.example.todo.entities.AuthorityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AuthorityRepository extends JpaRepository<AuthorityEntity, Long> {
  @Modifying
  @Query("DELETE FROM AuthorityEntity a WHERE a.user.id = :userId")
  void deleteAllByUserId(long userId);
}
