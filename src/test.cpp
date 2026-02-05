//    #include <iostream>
//     #include <vector>
//     using namespace std;
//     class Node{
//     public:
//         int data;
//         Node* next;
       
//     Node(int val){
//         data=val;
//         next=nullptr;
//     }
//     };
    
//     //Node* means this will return a pointer of type Node
//     Node* convertArrayToLL(vector<int> &arr){
//         Node* head=new Node(arr[0]);
//         Node* mover=head;
//         for(int i=1;i<arr.size();i++){
//             Node* temp = new Node(arr[i]);
//             mover->next=temp;
//             mover=temp;
//         }
//         return head;
//     }
//     Node* deleteAtTail(Node* head){
//         if(head==nullptr) return nullptr;
//         if(head->next==nullptr){
//             free(head);
//             return nullptr;
//         }
//         Node* temp = head;
//         while(temp->next->next!=nullptr){
//             temp=temp->next;
//         }
//         free(temp->next);
//         temp->next=nullptr;
//         return head;
//     }
//     Node* deleteAtHead(Node* head){
//         if(head==nullptr) return head;
//         Node* temp=head;
//         head=temp->next;
//         free(temp);
//         return head;
//     }
//     //   O(k) time complexity
//     Node* deleteAtK(Node* head,int k){
//         if(head==nullptr) return nullptr;
//         if(k==1){
//             Node* temp = head;
//             head=head->next;
//             free(temp);
//             return head;
//         }
//         int count =0;
//         Node* prev=nullptr;
//         Node* temp = head;
//         while(temp!=nullptr){
//             count++;
//             if(count==k){
//                 prev->next=temp->next;
//                 free(temp);
//                 break;
//             }
//             prev=temp;
//             temp=temp->next;
//         }
//         return head;
//     }
// Node* insertAtK(Node* head, int val, int k) {


//     // Case 1: Insert in empty list
//     if(head == nullptr) {
//         if(k == 1) return new Node(val);
//         return nullptr;
//     }


//     // Case 2: Insert at Head
//     if(k == 1) {
//         Node* temp = new Node(val);
//         temp->next = head;
//         return temp;
//     }


//     // Case 3: Insert in middle or end
//     Node* temp = head;


//     for(int i = 1; i < k - 1; i++) {
//         if(temp == nullptr) return head; // Invalid position
//         temp = temp->next;
//     }


//     Node* newNode = new Node(val);
//     newNode->next = temp->next;
//     temp->next = newNode;


//     return head;
// }


	
//     int main() {
//     vector<int> arr={1,2,3,4};
//     Node* a=convertArrayToLL(arr);
//     // deleteAtTail(a);
//     // a=deleteAtHead(a);
//     a = deleteAtK(a,2);
//     while(a!=nullptr){
//         cout<<a->data<<" ";
//         a=a->next;
//     }
   
   


//         return 0;
//     }


#include <iostream>
#include<vector>
using namespace std;

class Node{
    public:
    int data;
    Node* prev;
    Node* next;
    public:
    Node(int val){
        data=val;
        prev=nullptr;
        next=nullptr;
    }
};

Node* convertArrayToDLL(vector<int> &arr){
    Node* head= new Node(arr[0]);
    Node* mover= head;
    for(int i=1;i<arr.size();i++){
        Node* temp = new Node(arr[i]);
        mover->next= temp;
        temp->prev=mover;
        mover=mover->next;
    }
    return head;
}

void Print(Node* head){
    while(head!=nullptr){
        cout<<head->data<<" ";
        head=head->next;
    }
}
Node* deleteHead(Node* head){
    if(head==nullptr || head->next==nullptr) return head;
    Node* temp = head;
    head=head->next;
    head->prev=  nullptr;
    delete temp;
    return head;
}

Node* deleteTail(Node* head){
    if(head==nullptr || head->next==nullptr) return head; 
    Node* temp = head;
    while(temp->next->next!=nullptr){
        temp=temp->next;
    }
    // whenever you delete a node make it prev also nullptr
    temp->next->prev=nullptr;
    delete temp->next;
    temp->next=nullptr;
    return head;
}

Node* deleteKthElement(Node* head,int k){
    if(head==nullptr)return head;
    if(head->next==nullptr){
        if(k==1){
            return nullptr;
        }else{
            return head;
        }
    }
    int count=0;
    Node* Knode= head;
    while(Knode!=nullptr){
        count++;
        if(count==k) break;
        Knode=Knode->next;
    }
    //now Knode is at the node to be deleted
    if(Knode==nullptr) return head;

    if(Knode->prev==nullptr) {
      return deleteHead(head);
    }
    if(Knode->next==nullptr) {
      return deleteTail(head);
    }

    Node* back = Knode->prev;
    Node* front= Knode->next;
    back->next=front;
    front->prev=back;

    Knode->prev = nullptr;
    Knode->next = nullptr;
    delete Knode;

    return head;

}

// Delete a given node and (node!=head)

void deleteNode(Node* temp){
    if(temp->next ==nullptr){
        temp->prev->next=nullptr;
        temp->prev=nullptr;
        delete temp;
        return;
    }

    temp->prev->next=temp->next;
    temp->next->prev=temp->prev;

    temp->next = temp->prev = nullptr;
    delete temp;
    return;
} 

Node* insertBeforeHead(Node* head,int val){
    Node* newNode= new Node(val);
    newNode->next=head;
    head->prev=newNode;
    return newNode;
}

Node* insertAfterTail(Node* head,int val){
    if(head==nullptr) return new Node(val);
    Node* temp = head;
    while(temp->next!=nullptr){
        temp= temp->next;
    }
    temp->next = new Node(val);
    temp->next->prev=temp;
    return head;
}

Node* insertAtKthPostition(Node* head,int k, int val){
    if(head==nullptr){
        if(k==1){
            return new Node(val);
        }else{
            return head;
        }
    }
    if(k==1){
        return insertBeforeHead(head,val);
    }

    Node* temp = head;
    for(int i=1;i<k-1;i++){
        if(temp->next==nullptr) return head;
        temp=temp->next;
    }
    if(temp->next==nullptr){
        return insertAfterTail(head,val);
    }
   Node* newnNode= new Node(val);
   newnNode->next= temp->next;
   newnNode->prev= temp;
   temp->next=newnNode;
   newnNode->next->prev=newnNode;
   return head;
}

void insertBeforNode(Node* temp,int val){
    Node* back = temp->prev;
    Node* newNode= new Node(val);
    newNode->next = temp;
    temp->prev=newNode;
    newNode->prev=back;
    back->next=newNode;
    return;
}
int main(){
vector<int> arr={9,5,6,2,1};
Node* head = convertArrayToDLL(arr);
// head = deleteHead(head);
// head = deleteTail(head);
//  deleteNode(head->next);
// head= insertBeforeHead(head,10);
// head= insertAfterTail(head,10);
// head= insertAtKthPostition(head,7,7);
insertBeforNode(head->next->next,0);
Print(head);
}