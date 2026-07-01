pipeline {
  agent { label 'klymene' }

  options {
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  stages {
    stage('Add patch Changeset') {
      steps {
        checkout scm
        withCredentials([
          usernamePassword(
            credentialsId: 'github token',
            usernameVariable: 'GITHUB_RELEASE_USER',
            passwordVariable: 'GH_TOKEN'
          )
        ]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail

            branch='feat/migrate-shared-card-profile-15'
            repository='derliebemarcus/homeassistant_custom_refrigerator_card'

            git fetch origin "refs/heads/${branch}:refs/remotes/origin/${branch}"
            git checkout -B "$branch" "origin/$branch"

            printf '%s' 'LS0tCmhvbWVhc3Npc3RhbnRfY3VzdG9tX3JlZnJpZ2VyYXRvcl9jYXJkOiBwYXRjaAotLS0KClVwZGF0ZSB0aGUgY2FyZCByZWxlYXNlIHByb2Nlc3MuCg==' \
              | base64 --decode > .changeset/card-update.md

            git add .changeset/card-update.md
            if git diff --cached --quiet; then
              echo 'Patch Changeset already present.'
              exit 0
            fi

            git config user.name 'jenkins-release'
            git config user.email 'jenkins-release@users.noreply.github.com'
            git commit -m 'add: release metadata'
            gh auth setup-git
            git remote set-url origin "https://github.com/${repository}.git"
            git push origin "HEAD:refs/heads/${branch}"
          '''
        }
      }
    }
  }
}
